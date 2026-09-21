import { buildSync } from "esbuild";
import assert from "node:assert/strict";
buildSync({
  entryPoints: ["lib/domain.ts"],
  bundle: true,
  platform: "node",
  format: "esm",
  outfile: ".sites-runtime/domain.mjs",
});
buildSync({
  entryPoints: ["lib/seed.ts"],
  bundle: true,
  platform: "node",
  format: "esm",
  outfile: ".sites-runtime/seed.mjs",
});
const { apply, stock, projectRemaining, visible } = await import(
    "../.sites-runtime/domain.mjs"
  ),
  { seedData } = await import("../.sites-runtime/seed.mjs");
let s = seedData();
const admin = { id: "A", role: "admin", scope: "all", name: "Admin" },
  op = { id: "O", role: "operator", scope: "SITE-1", name: "Operator" },
  qa = { id: "Q", role: "qa", scope: "all", name: "QA" };
function command(u, a, b) {
  const out = apply(structuredClone(s), u, a, b);
  s = out.state;
  return out.result;
}
let checks = 0;
function check(name, fn) {
  fn();
  checks++;
  console.log("PASS", name);
}
check("cannot invent returned inventory", () =>
  assert.throws(
    () =>
      command(op, "adjustment.create", {
        batchId: "BAT-002",
        type: "return",
        weight: 1,
        reason: "test",
      }),
    /原发运单/,
  ),
);
check("return capped by undeployed signed weight", () =>
  assert.throws(
    () =>
      command(op, "adjustment.create", {
        batchId: "BAT-002",
        dispatchId: "DSP-2",
        type: "return",
        weight: 96,
        reason: "test",
      }),
    /超过/,
  ),
);
const ret = command(op, "adjustment.create", {
  batchId: "BAT-002",
  dispatchId: "DSP-2",
  type: "return",
  weight: 95,
  reason: "退回剩余物料",
});
check("pending return reserves project balance", () =>
  assert.equal(
    projectRemaining(
      s,
      s.find((r) => r.id === "DSP-2"),
    ),
    0,
  ),
);
check("pending return prevents double allocation to deployment", () =>
  assert.throws(
    () =>
      command(admin, "deployment.create", {
        dispatchId: "DSP-2",
        weight: 1,
        date: new Date().toISOString().slice(0, 10),
        location: "reef",
      }),
    /超过/,
  ),
);
const before = stock(s, "BAT-002").onhand;
command(qa, "adjustment.approve", { id: ret.id });
check("return adds stock and triggers quarantine", () => {
  assert.equal(stock(s, "BAT-002").onhand, before + 95000);
  assert.equal(stock(s, "BAT-002").available, 0);
  assert.equal(s.find((r) => r.id === "BAT-002").quality, "quarantined");
});
check("return requires a new inspection", () =>
  assert.throws(() => command(qa, "batch.release", { id: "BAT-002" }), /检验/),
);
command(qa, "batch.inspect", {
  id: "BAT-002",
  result: "pass",
  notes: "退料复检合格",
});
command(qa, "batch.release", { id: "BAT-002" });
const loss = command(op, "adjustment.create", {
  batchId: "BAT-002",
  type: "loss",
  weight: 1,
  reason: "盘差",
});
command(qa, "adjustment.reject", { id: loss.id, reason: "凭证不全" });
check("rejected adjustment cannot affect ledger", () => {
  assert.equal(stock(s, "BAT-002").onhand, before + 95000);
  assert.throws(
    () => command(qa, "adjustment.approve", { id: loss.id }),
    /已经/,
  );
});
const withdrawn = command(op, "adjustment.create", {
  batchId: "BAT-002",
  type: "loss",
  weight: 1,
  reason: "盘差",
});
command(op, "adjustment.withdraw", { id: withdrawn.id, reason: "误填" });
check("withdrawn adjustment cannot be approved", () =>
  assert.throws(
    () => command(qa, "adjustment.approve", { id: withdrawn.id }),
    /已经/,
  ),
);
check("cannot close project with open demand", () =>
  assert.throws(
    () => command(admin, "project.close", { id: "PRO-1", reason: "done" }),
    /未关闭/,
  ),
);
check("cannot correct receipt below allocated input", () =>
  assert.throws(
    () =>
      command(op, "receipt.correct", {
        id: "REC-0007",
        gross: 1,
        tare: 0,
        reject: 0,
        reason: "test",
      }),
    /已投料/,
  ),
);
const rec = s.find((r) => r.id === "REC-0007");
command(op, "receipt.correct", {
  id: rec.id,
  gross: rec.gross / 1000 + 1,
  tare: rec.tare / 1000,
  reject: rec.reject / 1000,
  reason: "复核秤单",
});
check("weighing correction preserves before and after evidence", () =>
  assert(
    s.some(
      (r) =>
        r.kind === "correction" &&
        r.receiptId === rec.id &&
        r.oldGross === rec.gross &&
        r.newGross === rec.gross + 1000,
    ),
  ),
);
const p = command(admin, "pickup.create", {
  partnerId: "PAR-1",
  expected: 10,
  scheduled: "2026-12-01",
  buckets: 1,
});
const t = command(admin, "trip.create", {
  name: "失败回收测试",
  driverId: "D",
  vehicleId: "VEH-1",
  scheduled: "2026-12-01",
  pickupIds: [p.id],
});
command(admin, "pickup.fail", { id: p.id, reason: "门店暂停营业" });
check("failed pickup completes route", () =>
  assert.equal(s.find((r) => r.id === t.id).status, "completed"),
);
command(admin, "pickup.reschedule", {
  id: p.id,
  scheduled: "2026-12-02",
  reason: "重新约定",
});
check("failed pickup can be rescheduled", () => {
  const p2 = s.find((r) => r.id === p.id);
  assert.equal(p2.status, "requested");
  assert.equal(p2.tripId, undefined);
});
const t2 = command(admin, "trip.create", {
  name: "取消线路测试",
  driverId: "D",
  vehicleId: "VEH-1",
  scheduled: "2026-12-02",
  pickupIds: [p.id],
});
command(admin, "trip.cancel", { id: t2.id, reason: "车辆检修" });
check("cancelled route releases pickups", () =>
  assert.equal(s.find((r) => r.id === p.id).status, "requested"),
);
check("audit contains material before and after changes", () =>
  assert(
    s.some(
      (r) =>
        r.kind === "audit" &&
        r.action === "receipt.correct" &&
        r.changes.some((c) => c.id === rec.id && c.before && c.after),
    ),
  ),
);
check('scoped audit does not expose collateral changes outside the authorized records', () => {
  const scopedUser = {id:'R',role:'restaurant',scope:'PAR-1',name:'Restaurant'};
  const audit = {id:'AUD-SCOPE',kind:'audit',actor:'R',changes:[{id:'PAR-1',after:{name:'own'}},{id:'PAR-2',after:{name:'private'}}]};
  const visibleState = visible([...s,audit],scopedUser);
  assert.deepEqual(visibleState.find(r=>r.id===audit.id).changes.map(c=>c.id),['PAR-1']);
  assert.equal(audit.changes.length,2);
});
console.log(checks + " exception checks passed");
