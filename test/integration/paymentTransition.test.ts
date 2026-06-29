import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { closePool, getPool, hasTestDb } from "./db";

/**
 * The payment fulfillment design depends on a single SQL invariant:
 *
 *   UPDATE payments SET status='paid' WHERE reference=$1 AND status<>'paid'
 *
 * When verify, the webhook, and the reconcile cron all observe the same
 * success at once, exactly ONE of them must flip the row and therefore run
 * the side-effects (fulfillment / refund). This suite proves that invariant
 * directly against Postgres under real concurrency.
 *
 * NOTE: this tests the STRATEGY the code relies on, not the supabase-js
 * wrapper in lib/payments.ts (that would need a full Supabase instance).
 */
describe.skipIf(!hasTestDb)("single-winner payment transition invariant", () => {
  beforeAll(async () => {
    await getPool().query(`
      CREATE TABLE IF NOT EXISTS test_payments (
        reference TEXT PRIMARY KEY,
        status    TEXT NOT NULL DEFAULT 'pending'
      )
    `);
  });
  afterAll(async () => {
    await getPool().query("DROP TABLE IF EXISTS test_payments");
    await closePool();
  });
  beforeEach(async () => {
    await getPool().query("TRUNCATE test_payments");
  });

  async function claimPaid(reference: string): Promise<boolean> {
    const res = await getPool().query(
      "UPDATE test_payments SET status='paid' WHERE reference=$1 AND status<>'paid' RETURNING reference",
      [reference],
    );
    return (res.rowCount ?? 0) === 1;
  }

  it("only one of many concurrent claimants wins the pending→paid transition", async () => {
    const ref = "ZY-20260629-9001-a1";
    await getPool().query("INSERT INTO test_payments (reference) VALUES ($1)", [ref]);

    const claims = await Promise.all(
      Array.from({ length: 20 }, () => claimPaid(ref)),
    );

    const winners = claims.filter(Boolean).length;
    expect(winners).toBe(1); // exactly one observer runs the side-effects
    const res = await getPool().query("SELECT status FROM test_payments WHERE reference=$1", [ref]);
    expect(res.rows[0].status).toBe("paid");
  });

  it("a second claim after the row is already paid loses (no double fulfillment)", async () => {
    const ref = "ZY-20260629-9002-a1";
    await getPool().query("INSERT INTO test_payments (reference, status) VALUES ($1, 'paid')", [ref]);
    expect(await claimPaid(ref)).toBe(false);
  });
});
