import { PrismaClient } from "@prisma/client";
import util from "util";

const pkg = require("./package.json") as Record<string, any>;
const prisma = new PrismaClient();
const sleep = util.promisify(setTimeout);

describe("itx-pdp", () => {
  beforeEach(async () => {
    await prisma.user.deleteMany();
  });

  test("basic", async () => {
    const result = await prisma.$transaction(async (prisma) => {
      await prisma.user.create({
        data: {
          email: "user_1@website.com",
        },
      });

      await prisma.user.create({
        data: {
          email: "user_2@website.com",
        },
      });

      return prisma.user.findMany();
    });

    expect(result.length).toBe(2);
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

  test("postgresql: nested create", async () => {
    const result = prisma.$transaction(async (tx) => {
      await tx.user.create({
        data: {
          email: "user_1@website.com",
        },
      });

      await prisma.$transaction(async (tx) => {
        await tx.user.create({
          data: {
            email: "user_2@website.com",
          },
        });
      });

      return tx.user.findMany();
    });

    await expect(result).resolves.toHaveLength(2);
  });

  /**
   * We don't allow certain methods to be called in a transaction
   */
  test("forbidden", async () => {
    const forbidden = [
      "$connect",
      "$disconnect",
      "$on",
      "$transaction",
      "$use",
    ];
    expect.assertions(forbidden.length + 1);

    const result = prisma.$transaction((prisma) => {
      for (const method of forbidden) {
        expect(prisma).not.toHaveProperty(method);
      }
      return Promise.resolve();
    });

    await expect(result).resolves.toBe(undefined);
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

  test("batching", async () => {
    await prisma.$transaction([
      prisma.user.create({
        data: {
          email: "user_1@website.com",
        },
      }),
      prisma.user.create({
        data: {
          email: "user_2@website.com",
        },
      }),
    ]);

    const users = await prisma.user.findMany();

    expect(users.length).toBe(2);
  });

  test("batching rollback", async () => {
    const result = prisma.$transaction([
      prisma.user.create({
        data: {
          email: "user_1@website.com",
        },
      }),
      prisma.user.create({
        data: {
          email: "user_1@website.com",
        },
      }),
    ]);

    await expect(result).rejects.toThrow(
      `Unique constraint failed on the fields`
    );

    const users = await prisma.user.findMany();

    expect(users.length).toBe(0);
  });

  /**
   * A bad batch should rollback using the interactive transaction logic
   * // TODO: skipped because output differs from binary to library
   */
  test("batching raw rollback", async () => {
    await prisma.user.create({
      data: {
        id: "1",
        email: "user_1@website.com",
      },
    });

    const result = prisma.$transaction([
      prisma.$executeRaw`INSERT INTO "User" (id, email) VALUES (${"2"}, ${"user_2@website.com"})`,
      prisma.$queryRaw`DELETE FROM "User"`,
      prisma.$executeRaw`INSERT INTO "User" (id, email) VALUES (${"1"}, ${"user_1@website.com"})`,
      prisma.$executeRaw`INSERT INTO "User" (id, email) VALUES (${"1"}, ${"user_1@website.com"})`,
    ]);

    await expect(result).rejects.toThrow(`Raw query failed. Code: \`23505\``);

    const users = await prisma.user.findMany();

    expect(users.length).toBe(1);
  });

  describe("middlewares", () => {
    test("middleware basic", async () => {
      const isolatedPrisma = new PrismaClient();
      let runInTransaction = false;

      isolatedPrisma.$use(async (params, next) => {
        await next(params);

        runInTransaction = params.runInTransaction;

        return "result";
      });

      const result = await isolatedPrisma.$transaction((prisma) => {
        return prisma.user.create({
          data: {
            email: "user_1@website.com",
          },
        });
      });

      expect(result).toBe("result");
      expect(runInTransaction).toBe(true);
    });

    /**
     * Middlewares should work normally on batches
     */
    test("middlewares batching", async () => {
      const isolatedPrisma = new PrismaClient();
      isolatedPrisma.$use(async (params, next) => {
        const result = await next(params);

        return result;
      });

      await isolatedPrisma.$transaction([
        prisma.user.create({
          data: {
            email: "user_1@website.com",
          },
        }),
        prisma.user.create({
          data: {
            email: "user_2@website.com",
          },
        }),
      ]);

      const users = await prisma.user.findMany();

      expect(users.length).toBe(2);
    });

    test("middleware exclude from transaction", async () => {
      const isolatedPrisma = new PrismaClient();

      isolatedPrisma.$use((params, next) => {
        return next({ ...params, runInTransaction: false });
      });

      await isolatedPrisma
        .$transaction(async (prisma) => {
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
        })
        .catch((e) => {});

      const users = await isolatedPrisma.user.findMany();
      expect(users).toHaveLength(1);
    });
  });

  /**
   * Two concurrent transactions should work
   */
  test("concurrent", async () => {
    await Promise.all([
      prisma.$transaction([
        prisma.user.create({
          data: {
            email: "user_1@website.com",
          },
        }),
      ]),
      prisma.$transaction([
        prisma.user.create({
          data: {
            email: "user_2@website.com",
          },
        }),
      ]),
    ]);

    const users = await prisma.user.findMany();

    expect(users.length).toBe(2);
  });

  test("high concurrency", async () => {
    jest.setTimeout(30_000);

    await prisma.user.create({
      data: {
        email: "x",
        name: "y",
      },
    });

    for (let i = 0; i < 5; i++) {
      await Promise.allSettled([
        prisma.$transaction(
          (tx) =>
            tx.user.update({ data: { name: "a" }, where: { email: "x" } }),
          { timeout: 25 }
        ),
        prisma.$transaction(
          (tx) =>
            tx.user.update({ data: { name: "b" }, where: { email: "x" } }),
          { timeout: 25 }
        ),
        prisma.$transaction(
          (tx) =>
            tx.user.update({ data: { name: "c" }, where: { email: "x" } }),
          { timeout: 25 }
        ),
        prisma.$transaction(
          (tx) =>
            tx.user.update({ data: { name: "d" }, where: { email: "x" } }),
          { timeout: 25 }
        ),
        prisma.$transaction(
          (tx) =>
            tx.user.update({ data: { name: "e" }, where: { email: "x" } }),
          { timeout: 25 }
        ),
        prisma.$transaction(
          (tx) =>
            tx.user.update({ data: { name: "f" }, where: { email: "x" } }),
          { timeout: 25 }
        ),
        prisma.$transaction(
          (tx) =>
            tx.user.update({ data: { name: "g" }, where: { email: "x" } }),
          { timeout: 25 }
        ),
        prisma.$transaction(
          (tx) =>
            tx.user.update({ data: { name: "h" }, where: { email: "x" } }),
          { timeout: 25 }
        ),
        prisma.$transaction(
          (tx) =>
            tx.user.update({ data: { name: "i" }, where: { email: "x" } }),
          { timeout: 25 }
        ),
        prisma.$transaction(
          (tx) =>
            tx.user.update({ data: { name: "j" }, where: { email: "x" } }),
          { timeout: 25 }
        ),
      ]).catch(() => {}); // we don't care for errors, there will be
    }
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
