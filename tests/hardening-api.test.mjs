import assert from "node:assert/strict";
const base = "http://localhost:5173";
async function login(username, password = "Reef!2026Cycle") {
  const r = await fetch(base + "/api/auth", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: base },
    body: JSON.stringify({ username, password }),
  });
  assert.equal(r.status, 200, await r.text());
  return r.headers.get("set-cookie").split(";")[0];
}
const admin = await login("admin"),
  op = await login("operator"),
  qa = await login("qa"),
  restaurant = await login("restaurant");
async function post(cookie, action, data, key = crypto.randomUUID()) {
  const r = await fetch(base + "/api/action", {
    method: "POST",
    headers: {
      Cookie: cookie,
      Origin: base,
      "Content-Type": "application/json",
      "Idempotency-Key": key,
    },
    body: JSON.stringify({ action, data }),
  });
  return { status: r.status, ...(await r.json()) };
}
async function command(cookie, action, data, key) {
  const r = await post(cookie, action, data, key);
  assert.equal(r.status, 200, JSON.stringify(r));
  return r.result;
}
const suffix = crypto.randomUUID().slice(0, 8),
  project = await command(admin, "project.create", {
    name: "验收项目-" + suffix,
    location: "本地测试点",
    target: 20,
    manager: "测试经理",
  });
const account = await command(admin, "user.create", {
    username: "test_" + suffix,
    name: "验收经理",
    role: "project",
    scope: project.id,
    password: "TestOnly!2026Strong",
  }),
  manager = await login(account.username, "TestOnly!2026Strong");
const demand = await command(manager, "demand.create", {
    weight: 20,
    due: "2026-12-01",
    notes: "本地端到端验收",
  }),
  reservation = await command(admin, "reservation.create", {
    demandId: demand.id,
    batchId: "BAT-010",
    weight: 20,
  });
assert.equal(
  (
    await post(manager, "project.close", {
      id: project.id,
      reason: "premature",
    })
  ).status,
  400,
);
console.log("PASS project cannot close with unresolved demand");
const dispatch = await command(op, "dispatch.create", {
  reservationId: reservation.id,
  weight: 20,
  vehicle: "本地验收车",
});
await command(manager, "dispatch.receive", { id: dispatch.id, weight: 20 });
const ret = await command(op, "adjustment.create", {
  batchId: "BAT-010",
  dispatchId: dispatch.id,
  type: "return",
  weight: 5,
  reason: "余料退回",
});
assert.equal(
  (
    await post(manager, "deployment.create", {
      dispatchId: dispatch.id,
      weight: 16,
      date: new Date(Date.now() + 8 * 3600000).toISOString().slice(0, 10),
      location: "试验礁",
    })
  ).status,
  400,
);
console.log("PASS pending return blocks competing deployment");
await command(qa, "adjustment.approve", { id: ret.id });
assert.equal(
  (
    await post(manager, "deployment.create", {
      dispatchId: dispatch.id,
      weight: 15,
      date: new Date(Date.now() + 8 * 3600000).toISOString().slice(0, 10),
      location: "试验礁",
    })
  ).status,
  400,
);
console.log("PASS quarantine prevents project deployment");
await command(qa, "batch.inspect", {
  id: "BAT-010",
  result: "pass",
  notes: "退回批次复检合格",
});
await command(qa, "batch.release", { id: "BAT-010" });
await command(manager, "deployment.create", {
  dispatchId: dispatch.id,
  weight: 15,
  date: new Date(Date.now() + 8 * 3600000).toISOString().slice(0, 10),
  location: "试验礁",
});
await command(manager, "demand.close", {
  id: demand.id,
  reason: "投放15kg，余料5kg退回",
});
await command(manager, "project.close", {
  id: project.id,
  reason: "现场目标调整为15kg，余料已退回",
});
console.log(
  "PASS real database workflow: reserve → ship → receive → return → inspect → deploy → close",
);
assert.equal(
  (
    await post(admin, "reservation.create", {
      demandId: demand.id,
      batchId: "BAT-010",
      weight: 1,
    })
  ).status,
  400,
);
console.log("PASS closed demand rejects new allocation");
const key = crypto.randomUUID(),
  payload = { expected: 1, scheduled: "2026-12-01", buckets: 1 };
const pickup = await command(restaurant, "pickup.create", payload, key);
assert.equal(
  (await post(restaurant, "pickup.create", { ...payload, expected: 2 }, key))
    .status,
  400,
);
await command(restaurant, "pickup.cancel", {
  id: pickup.id,
  reason: "测试结束",
});
console.log("PASS idempotency key cannot be reused with a different payload");
assert.equal(
  (
    await post(op, "receipt.correct", {
      id: "REC-0001",
      gross: 120,
      tare: 10,
      reject: 0,
      reason: "越权测试",
    })
  ).status,
  400,
);
console.log("PASS cross-site weighing correction denied");
const bad = new FormData();
bad.append("targetId", "BAT-010");
bad.append(
  "file",
  new File(["not a real png"], "fake.png", { type: "image/png" }),
);
assert.equal(
  (
    await fetch(base + "/api/files", {
      method: "POST",
      headers: { Cookie: op, Origin: base },
      body: bad,
    })
  ).status,
  400,
);
console.log("PASS forged file type rejected");
await command(admin, "user.toggle", { id: account.id });
assert.equal(
  (await fetch(base + "/api/data", { headers: { Cookie: manager } })).status,
  401,
);
console.log("PASS disabling an account immediately revokes its session");
const snapshot = await (
  await fetch(base + "/api/data", { headers: { Cookie: admin } })
).json();
assert(
  snapshot.records.some(
    (x) =>
      x.kind === "audit" &&
      x.action === "user.create" &&
      x.target === account.id,
  ),
);
assert(
  !JSON.stringify(snapshot.records.filter((x) => x.kind === "audit")).includes(
    "TestOnly!2026Strong",
  ),
);
console.log("PASS account administration audited without plaintext password");
