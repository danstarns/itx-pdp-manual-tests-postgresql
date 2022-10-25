import { PrismaClient } from "@prisma/client";
import util from "util";

const pkg = require("./package.json") as Record<string, any>;
const prisma = new PrismaClient();
const sleep = util.promisify(setTimeout);

describe("itx-pdp-errors", () => {
  beforeEach(async () => {
    await prisma.user.deleteMany();
  });

  test("timeout default", async () => {
    const result = prisma.$transaction(async (prisma) => {
      await prisma.user.create({
        data: {
          email: "user_1@website.com",
        },
      });

      await sleep(6000);
    });

    await expect(result).rejects.toMatchObject({
      message: expect.stringContaining(
        "Transaction API error: Transaction already closed"
      ),
      code: "P2028",
      clientVersion: pkg.dependencies["@prisma/client"],
    });
  });

  test("timeout override", async () => {
    const result = prisma.$transaction(
      async (prisma) => {
        await prisma.user.create({
          data: {
            email: "user_1@website.com",
          },
        });

        await new Promise((res) => setTimeout(res, 600));
      },
      {
        maxWait: 200,
        timeout: 500,
      }
    );

    await expect(result).rejects.toMatchObject({
      message: expect.stringContaining(
        "Transaction API error: Transaction already closed"
      ),
    });

    expect(await prisma.user.findMany()).toHaveLength(0);
  });

  test("rollback throw", async () => {
    const result = prisma.$transaction(async (prisma) => {
      await prisma.user.create({
        data: {
          email: "user_1@website.com",
        },
      });

      throw new Error("you better rollback now");
    });

    await expect(result).rejects.toThrow("you better rollback now");

    const users = await prisma.user.findMany();

    expect(users.length).toBe(0);
  });

  test("rollback throw value", async () => {
    const result = prisma.$transaction(async (prisma) => {
      await prisma.user.create({
        data: {
          email: "user_1@website.com",
        },
      });

      throw "you better rollback now";
    });

    await expect(result).rejects.toBe(`you better rollback now`);

    const users = await prisma.user.findMany();

    expect(users.length).toBe(0);
  });

  test("rollback query", async () => {
    const result = prisma.$transaction(async (prisma) => {
      await prisma.user.create({
        data: {
          email: "user_1@website.com",
        },
      });

      await prisma.user.create({
        data: {
          email: "user_1@website.com",
        },
      });
    });

    await expect(result).rejects.toThrow(
      "Unique constraint failed on the fields: (`email`)"
    );

    const users = await prisma.user.findMany();

    expect(users.length).toBe(0);
  });

  test("already committed", async () => {
    let transactionBoundPrisma;
    await prisma.$transaction((prisma) => {
      transactionBoundPrisma = prisma;
      return Promise.resolve();
    });

    const result = prisma.$transaction(async () => {
      await transactionBoundPrisma.user.create({
        data: {
          email: "user_1@website.com",
        },
      });
    });

    await expect(result).rejects.toMatchObject({
      message: expect.stringContaining(
        "Transaction API error: Transaction already closed"
      ),
      code: "P2028",
      clientVersion: pkg.dependencies["@prisma/client"],
    });

    await expect(result).rejects.toThrow(
      `Transaction API error: Transaction already closed: A query cannot be executed on a closed transaction`
    );

    const users = await prisma.user.findMany();

    expect(users.length).toBe(0);
  });

  test("rollback with then calls", async () => {
    const result = prisma.$transaction(async (prisma) => {
      await prisma.user
        .create({
          data: {
            email: "user_1@website.com",
          },
        })
        .then();

      await prisma.user
        .create({
          data: {
            email: "user_2@website.com",
          },
        })
        .then()
        .then();

      throw new Error("rollback");
    });

    await expect(result).rejects.toThrow("rollback");

    const users = await prisma.user.findMany();

    expect(users.length).toBe(0);
  });

  test("rollback with catch calls", async () => {
    const result = prisma.$transaction(async (prisma) => {
      await prisma.user
        .create({
          data: {
            email: "user_1@website.com",
          },
        })
        .catch();
      await prisma.user
        .create({
          data: {
            email: "user_2@website.com",
          },
        })
        .catch()
        .then();

      throw new Error("rollback");
    });

    await expect(result).rejects.toThrow(`rollback`);

    const users = await prisma.user.findMany();

    expect(users.length).toBe(0);
  });

  test("rollback with finally calls", async () => {
    const result = prisma.$transaction(async (prisma) => {
      await prisma.user
        .create({
          data: {
            email: "user_1@website.com",
          },
        })
        .finally();

      await prisma.user
        .create({
          data: {
            email: "user_2@website.com",
          },
        })
        .then()
        .catch()
        .finally();

      throw new Error("rollback");
    });

    await expect(result).rejects.toThrow("rollback");

    const users = await prisma.user.findMany();

    expect(users.length).toBe(0);
  });

  test("high concurrency with SET FOR UPDATE", async () => {
    jest.setTimeout(60_000);
    const CONCURRENCY = 12;

    await prisma.user.create({
      data: {
        email: "x",
        name: "y",
        val: 1,
      },
    });

    const promises = [...Array(CONCURRENCY)].map(() =>
      prisma.$transaction(
        async (transactionPrisma) => {
          await transactionPrisma.$queryRaw`SELECT id from "User" where email = 'x' FOR UPDATE`;

          const user = await transactionPrisma.user.findUnique({
            rejectOnNotFound: true,
            where: {
              email: "x",
            },
          });

          // Add a delay here to force the transaction to be open for longer
          // this will increase the chance of deadlock in the itx transactions
          // if deadlock is a possibility.
          await sleep(100);

          const updatedUser = await transactionPrisma.user.update({
            where: {
              email: "x",
            },
            data: {
              val: user.val! + 1,
            },
          });

          return updatedUser;
        },
        { timeout: 60000, maxWait: 60000 }
      )
    );

    await Promise.allSettled(promises);

    const finalUser = await prisma.user.findUnique({
      rejectOnNotFound: true,
      where: {
        email: "x",
      },
    });

    expect(finalUser.val).toEqual(CONCURRENCY + 1);
  });

  describe("isolation levels", () => {
    test("invalid value", async () => {
      // @ts-ignore
      const result = prisma.$transaction(
        async (tx) => {
          await tx.user.create({ data: { email: "user@example.com" } });
        },
        {
          isolationLevel: "NotAValidLevel",
        }
      );

      await expect(result).rejects.toMatchObject({
        code: "P2023",
        clientVersion: pkg.dependencies["@prisma/client"],
      });

      await expect(result).rejects.toThrow(
        "Inconsistent column data: Conversion failed: Invalid isolation level `NotAValidLevel`"
      );
    });
  });
});
