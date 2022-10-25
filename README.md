# itx-pdp-manual-tests

## Getting Started

1. `npm install`
2. Specify `DATABASE_URL` in env
3. Migrate database `npm run prisma migrate`
4. Generate the data-proxy client `npm run prisma generate -- --data-proxy`
5. Run the test script `npm run test`
