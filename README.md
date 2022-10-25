# itx-pdp-manual-tests

## Getting Started

1. `npm install`
2. Specify `DATABASE_URL` in env
3. Migrate database `npm run prisma migrate`(Already done - you wont need to do this)
4. Generate the data-proxy client `npm run prisma generate -- --data-proxy`
5. Run the test script `npm run test`

## Output

```
  itx-pdp-manual-tests git:(main) npm run test

> itx-pdp-manual-tests@1.0.0 test
> jest

  console.warn
    prisma:warn `rejectOnNotFound` option is deprecated and will be removed in Prisma 5. Please use `prisma.user.findUniqueOrThrow` method instead

      at warn (node_modules/@prisma/client/runtime/index.js:31596:13)
      at warn (node_modules/@prisma/client/runtime/index.js:31639:5)
      at warnOnce (node_modules/@prisma/client/runtime/index.js:36047:5)
      at PrismaClient.warnAboutRejectOnNotFound [as _executeRequest] (node_modules/@prisma/client/runtime/index.js:35945:7)
      at _executeRequest (node_modules/@prisma/client/runtime/index.js:35888:23)
      at consumer (node_modules/@prisma/client/runtime/index.js:35893:51)
      at runInAsyncScope (node_modules/@prisma/client/runtime/index.js:35893:29)
      at cb (node_modules/@prisma/client/runtime/index.js:29088:12)
      at PrismaClient.runInChildSpan [as _request] (node_modules/@prisma/client/runtime/index.js:35890:22)
      at _request (node_modules/@prisma/client/runtime/index.js:34551:65)
      at requestFn (node_modules/@prisma/client/runtime/index.js:34569:18)
      at callback (node_modules/@prisma/client/runtime/index.js:34204:54)
      at Proxy._callback (node_modules/@prisma/client/runtime/index.js:34213:14)
      at Proxy.<anonymous> (node_modules/@prisma/client/runtime/index.js:36025:32)

 FAIL  ./index.test.ts (154.725 s)
  itx-pdp-errors
    ✕ timeout default (12122 ms)
    ✕ timeout override (3218 ms)
    ✕ rollback throw (3046 ms)
    ✕ rollback throw value (2584 ms)
    ✕ rollback query (3052 ms)
    ✕ already committed (2826 ms)
    ✕ rollback with then calls (3023 ms)
    ✕ rollback with catch calls (3219 ms)
    ✕ rollback with finally calls (3328 ms)
    ✕ high concurrency with SET FOR UPDATE (47990 ms)
    isolation levels
      ✕ invalid value (70054 ms)

  ● itx-pdp-errors › timeout default

    expect(received).rejects.toMatchObject(expected)

    - Expected  - 2
    + Received  + 1

      Object {
        "clientVersion": "4.6.0-integration-itx-pdp.1",
    -   "code": "P2028",
    -   "message": StringContaining "Transaction API error: Transaction already closed",
    +   "code": "P5000",
      }

      22 |     });
      23 |
    > 24 |     await expect(result).rejects.toMatchObject({
         |                                  ^
      25 |       message: expect.stringContaining(
      26 |         "Transaction API error: Transaction already closed"
      27 |       ),

      at Object.toMatchObject (node_modules/expect/build/index.js:210:22)
      at Object.toMatchObject (index.test.ts:24:34)

  ● itx-pdp-errors › timeout override

    expect(received).rejects.toMatchObject(expected)

    - Expected  - 3
    + Received  + 1

    - Object {
    -   "message": StringContaining "Transaction API error: Transaction already closed",
    - }
    + [BadRequestError: This request could not be understood by the server]

      48 |     );
      49 |
    > 50 |     await expect(result).rejects.toMatchObject({
         |                                  ^
      51 |       message: expect.stringContaining(
      52 |         "Transaction API error: Transaction already closed"
      53 |       ),

      at Object.toMatchObject (node_modules/expect/build/index.js:210:22)
      at Object.toMatchObject (index.test.ts:50:34)

  ● itx-pdp-errors › rollback throw

    expect(received).toBe(expected) // Object.is equality

    Expected: 0
    Received: 1

      72 |     const users = await prisma.user.findMany();
      73 |
    > 74 |     expect(users.length).toBe(0);
         |                          ^
      75 |   });
      76 |
      77 |   test("rollback throw value", async () => {

      at Object.toBe (index.test.ts:74:26)

  ● itx-pdp-errors › rollback throw value

    expect(received).toBe(expected) // Object.is equality

    Expected: 0
    Received: 1

      90 |     const users = await prisma.user.findMany();
      91 |
    > 92 |     expect(users.length).toBe(0);
         |                          ^
      93 |   });
      94 |
      95 |   test("rollback query", async () => {

      at Object.toBe (index.test.ts:92:26)

  ● itx-pdp-errors › rollback query

    expect(received).toBe(expected) // Object.is equality

    Expected: 0
    Received: 1

      114 |     const users = await prisma.user.findMany();
      115 |
    > 116 |     expect(users.length).toBe(0);
          |                          ^
      117 |   });
      118 |
      119 |   test("already committed", async () => {

      at Object.toBe (index.test.ts:116:26)

  ● itx-pdp-errors › already committed

    expect(received).rejects.toMatchObject()

    Received promise resolved instead of rejected
    Resolved to value: undefined

      132 |     });
      133 |
    > 134 |     await expect(result).rejects.toMatchObject({
          |           ^
      135 |       message: expect.stringContaining(
      136 |         "Transaction API error: Transaction already closed"
      137 |       ),

      at expect (node_modules/expect/build/index.js:105:15)
      at Object.expect (index.test.ts:134:11)

  ● itx-pdp-errors › rollback with then calls

    expect(received).toBe(expected) // Object.is equality

    Expected: 0
    Received: 2

      175 |     const users = await prisma.user.findMany();
      176 |
    > 177 |     expect(users.length).toBe(0);
          |                          ^
      178 |   });
      179 |
      180 |   test("rollback with catch calls", async () => {

      at Object.toBe (index.test.ts:177:26)

  ● itx-pdp-errors › rollback with catch calls

    expect(received).toBe(expected) // Object.is equality

    Expected: 0
    Received: 2

      203 |     const users = await prisma.user.findMany();
      204 |
    > 205 |     expect(users.length).toBe(0);
          |                          ^
      206 |   });
      207 |
      208 |   test("rollback with finally calls", async () => {

      at Object.toBe (index.test.ts:205:26)

  ● itx-pdp-errors › rollback with finally calls

    expect(received).toBe(expected) // Object.is equality

    Expected: 0
    Received: 2

      233 |     const users = await prisma.user.findMany();
      234 |
    > 235 |     expect(users.length).toBe(0);
          |                          ^
      236 |   });
      237 |
      238 |   test("high concurrency with SET FOR UPDATE", async () => {

      at Object.toBe (index.test.ts:235:26)

  ● itx-pdp-errors › high concurrency with SET FOR UPDATE

    expect(received).toEqual(expected) // deep equality

    Expected: 13
    Received: 2

      289 |     });
      290 |
    > 291 |     expect(finalUser.val).toEqual(CONCURRENCY + 1);
          |                           ^
      292 |   });
      293 |
      294 |   describe("isolation levels", () => {

      at Object.toEqual (index.test.ts:291:27)

  ● itx-pdp-errors › isolation levels › invalid value

    expect(received).rejects.toMatchObject(expected)

    - Expected  - 1
    + Received  + 1

      Object {
        "clientVersion": "4.6.0-integration-itx-pdp.1",
    -   "code": "P2023",
    +   "code": "P5006",
      }

      304 |       );
      305 |
    > 306 |       await expect(result).rejects.toMatchObject({
          |                                    ^
      307 |         code: "P2023",
      308 |         clientVersion: pkg.dependencies["@prisma/client"],
      309 |       });

      at Object.toMatchObject (node_modules/expect/build/index.js:210:22)
      at Object.toMatchObject (index.test.ts:306:36)

Test Suites: 1 failed, 1 total
Tests:       11 failed, 11 total
Snapshots:   0 total
Time:        154.761 s
Ran all test suites.
```
