import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { buildSync } from "esbuild";
import assert from "node:assert/strict";
buildSync({
  entryPoints: ["lib/relational.ts"],
  bundle: true,
  platform: "node",
  format: "esm",
  outfile: ".sites-runtime/relational.mjs",
});
buildSync({
  entryPoints: ["lib/seed.ts"],
  bundle: true,
  platform: "node",
  format: "esm",
  outfile: ".sites-runtime/seed.mjs",
});
const { ensureRelational, relationalSnapshot, relationalWrites } = await import(
  "../.sites-runtime/relational.mjs"
);
const { seedData } = await import("../.sites-runtime/seed.mjs");
function database() {
  const sql = new DatabaseSync(":memory:");
  sql.exec("PRAGMA foreign_keys=ON");
  for (const file of ["0000_moaning_banshee.sql", "0001_lame_maggott.sql"])
    sql.exec(readFileSync("drizzle/" + file, "utf8"));
  const db = {
    prepare(query) {
      let args = [];
      return {
        bind(...values) {
          args = values;
          return this;
        },
        async first() {
          return sql.prepare(query).get(...args) || null;
        },
        async all() {
          return { results: sql.prepare(query).all(...args) };
        },
        run() {
          return sql.prepare(query).run(...args);
        },
      };
    },
    async batch(statements) {
      sql.exec("BEGIN");
      try {
        const result = statements.map((s) => s.run());
        sql.exec("COMMIT");
        return result;
      } catch (e) {
        sql.exec("ROLLBACK");
        throw e;
      }
    },
  };
  return { sql, db };
}
const { sql, db } = database(),
  seed = JSON.parse(JSON.stringify(seedData()));
sql.prepare("INSERT INTO business_revision VALUES(1,7)").run();
for (const r of seed)
  sql
    .prepare("INSERT INTO business_records VALUES(?,?,?)")
    .run(r.id, r.kind, JSON.stringify(r));
const order = (s) => s.toSorted((a, b) => a.id.localeCompare(b.id));
await ensureRelational(db);
assert.deepEqual(order((await relationalSnapshot(db)).state), order(seed));
console.log(
  "PASS complete legacy migration preserves every field and relationship",
);
await ensureRelational(db);
assert.equal(sql.prepare("SELECT count(*) AS n FROM pickups").get().n, 300);
console.log("PASS migration is repeatable without duplicate rows");
assert.equal(sql.prepare("PRAGMA foreign_key_check").all().length, 0);
console.log("PASS all foreign keys valid");
const receipt = seed.find((r) => r.kind === "receipt");
await assert.rejects(
  () =>
    db.batch(
      relationalWrites(db, [{ ...receipt, id: "BAD-FK", pickupId: "missing" }]),
    ),
  /FOREIGN KEY/,
);
assert.equal(
  sql.prepare("SELECT count(*) AS n FROM receipts WHERE id=?").get("BAD-FK").n,
  0,
);
console.log("PASS foreign-key failure rolls back transaction");
await assert.rejects(
  () =>
    db.batch(
      relationalWrites(db, [{ ...receipt, accepted: receipt.accepted + 1 }]),
    ),
  /CHECK/,
);
console.log("PASS database enforces weighing mass balance");
const rs = seed.find((r) => r.kind === "reservation");
await assert.rejects(
  () => db.batch(relationalWrites(db, [{ ...rs, shipped: rs.qty + 1 }])),
  /CHECK/,
);
console.log("PASS database rejects overshipped reservation");
const updated = {
  ...seed.find((r) => r.kind === "partner"),
  name: "模拟滚动升级写入",
};
sql
  .prepare("UPDATE business_records SET data=? WHERE id=?")
  .run(JSON.stringify(updated), updated.id);
sql.exec("UPDATE business_revision SET version=8");
assert.equal(
  (await relationalSnapshot(db)).state.find((r) => r.id === updated.id).name,
  updated.name,
);
console.log(
  "PASS old-release writes reconcile safely during rolling deployment",
);
const exported = JSON.parse(
    JSON.stringify((await relationalSnapshot(db)).state),
  ),
  restored = database();
await restored.db.batch(relationalWrites(restored.db, exported));
restored.sql.exec("INSERT INTO business_revision VALUES(1,8)");
restored.sql
  .prepare("INSERT INTO relational_revision VALUES(1,8,?)")
  .run(new Date().toISOString());
assert.deepEqual(
  order((await relationalSnapshot(restored.db)).state),
  order(exported),
);
console.log("PASS business backup restores into a separate empty database");
sql.close();
restored.sql.close();
