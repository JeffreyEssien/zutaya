# Integration tests

These tests exercise the **real** atomic SQL the payment/stock correctness
depends on — they load the actual function bodies from
`supabase/migrations/025_atomic_orders_and_rate_limit.sql` into a throwaway
Postgres and assert behaviour under genuine concurrency.

## What they cover

| File | Guarantee proven |
|---|---|
| `createOrderAtomic.test.ts` | No oversell under N parallel orders; full rollback on a short line (no partial deduction, no orphan order); variant + inventory paths; stock never goes negative |
| `restoreStock.test.ts` | deduct → restore returns stock to exactly its starting value (variant, inventory, multi-line) |
| `paymentTransition.test.ts` | The `WHERE status<>'paid'` conditional UPDATE has exactly one winner under concurrency (no double fulfillment / double refund) |

The fixture schema (`schema.sql`) recreates **only** the columns the RPCs
touch. The logic under test is production logic — never reimplemented here.

## Running locally

They auto-skip unless `TEST_DATABASE_URL` is set, so a normal `npm test` is
unaffected. To run them you need a Postgres (Docker is easiest):

```bash
# 1. Start a throwaway Postgres 16
docker run -d --name zutaya-test-pg \
  -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=zutaya_test \
  -p 55432:5432 postgres:16

# 2. Point the tests at it and run
export TEST_DATABASE_URL="postgresql://postgres:postgres@localhost:55432/zutaya_test"
npm run test:integration

# 3. Tear down when done
docker rm -f zutaya-test-pg
```

## In CI

The `integration` job in `.github/workflows/ci.yml` spins up a `postgres:16`
service container and runs `npm run test:integration` automatically on every
push/PR. The `build` job depends on it, so a broken stock/payment invariant
blocks the pipeline before deploy.

## Notes

- Tests run **serially** (`--no-file-parallelism`) because they share one
  database. Don't remove that flag.
- `paymentTransition.test.ts` proves the SQL *strategy* `lib/payments.ts`
  relies on, not the supabase-js wrapper itself (that needs a full Supabase
  instance — a possible future addition).
