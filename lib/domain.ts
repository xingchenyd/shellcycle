export type Row = { id: string; kind: string; [key: string]: any };
export type User = {
  id: string;
  username: string;
  name: string;
  role: string;
  scope: string;
  active?: number;
};
export const roles: Record<string, string> = {
  admin: "运营管理员",
  dispatcher: "回收调度",
  restaurant: "餐厅负责人",
  driver: "回收司机",
  operator: "场地操作员",
  qa: "质量检验员",
  project: "修复项目经理",
};
export const kinds = [
  "partner",
  "site",
  "vehicle",
  "pickup",
  "trip",
  "receipt",
  "batch",
  "input",
  "inspection",
  "project",
  "demand",
  "reservation",
  "dispatch",
  "deployment",
  "ledger",
  "adjustment",
  "attachment",
  "audit",
  "rule",
  "correction",
  "ruleHistory",
] as const;
export const labels: Record<string, string> = {
  failed: "收取失败",
  withdrawn: "已撤回",
  requested: "待调度",
  assigned: "待收取",
  collected: "已收取",
  received: "已入库",
  cancelled: "已取消",
  rejected: "已拒收",
  assembling: "组批中",
  curing: "熟化中",
  released: "已放行",
  quarantined: "隔离中",
  scrapped: "已报废",
  open: "进行中",
  closed: "已结项",
  active: "有效",
  shipped: "已发运",
  partial: "部分完成",
  completed: "已完成",
  pending: "待审批",
  approved: "已批准",
  pass: "合格",
  fail: "不合格",
};
export function rows(s: Row[], kind: string) {
  return s.filter((r) => r.kind === kind);
}
export function find(s: Row[], id: string, kind?: string): Row {
  const r = s.find((r) => r.id === id && (!kind || r.kind === kind));
  if (!r) throw new Error("记录不存在或已被移除");
  return r;
}
export function assert(ok: any, msg: string): asserts ok {
  if (!ok) throw new Error(msg);
}
export function str(v: any, label = "内容", required = true) {
  const s = String(v ?? "").trim();
  assert(!required || s.length > 0, `请填写${label}`);
  assert(s.length <= 1000, `${label}过长`);
  return s;
}
export function grams(v: any, allowZero = false) {
  assert(
    v !== null && v !== undefined && String(v).trim() !== "",
    "请填写重量",
  );
  const n = Number(v);
  assert(
    Number.isFinite(n) && n >= 0 && (allowZero || n > 0) && n <= 1000000,
    "重量必须为有效的正数，最大 1,000,000 kg",
  );
  const g = Math.round(n * 1000);
  assert(allowZero || g > 0, "最小重量为 0.001 kg");
  return g;
}
export function date(v: any) {
  const s = str(v, "日期");
  assert(
    /^\d{4}-\d{2}-\d{2}$/.test(s) &&
      !isNaN(Date.parse(s)) &&
      new Date(s).toISOString().slice(0, 10) === s,
    "日期格式无效",
  );
  return s;
}
export function siteLoad(s: Row[], id: string) {
  const unallocated = rows(s, "receipt")
    .filter((r) => r.siteId === id)
    .reduce(
      (sum, r) =>
        sum +
        r.accepted -
        rows(s, "input")
          .filter((i) => i.receiptId === r.id)
          .reduce((n, i) => n + i.qty, 0),
      0,
    );
  return (
    unallocated +
    rows(s, "batch")
      .filter((r) => r.siteId === id)
      .reduce((sum, r) => sum + stock(s, r.id).onhand, 0)
  );
}
export function returned(s: Row[], dispatchId: string, includePending = false) {
  return rows(s, "adjustment")
    .filter(
      (r) =>
        r.type === "return" &&
        r.dispatchId === dispatchId &&
        (r.status === "approved" || (includePending && r.status === "pending")),
    )
    .reduce((n, r) => n + r.qty, 0);
}
export function projectRemaining(s: Row[], d: Row) {
  return (
    (d.received || 0) -
    rows(s, "deployment")
      .filter((r) => r.dispatchId === d.id)
      .reduce((n, r) => n + r.qty, 0) -
    returned(s, d.id, true)
  );
}
export function qty(n: number) {
  return (n / 1000).toLocaleString("zh-CN", { maximumFractionDigits: 3 });
}
export function stock(s: Row[], id: string) {
  const onhand = rows(s, "ledger")
    .filter((r) => r.batchId === id)
    .reduce((a, r) => a + r.delta, 0);
  const held = rows(s, "reservation")
    .filter((r) => r.batchId === id && r.status === "active")
    .reduce((a, r) => a + r.qty - r.shipped, 0);
  return {
    onhand,
    held,
    available: find(s, id, "batch").quality === "released" ? onhand - held : 0,
  };
}
export function visible(s: Row[], u: User): Row[] {
  if (["admin", "dispatcher", "qa"].includes(u.role)) return s;
  let selected: Row[] = [];
  if (u.role === "operator") {
    const batchIds = new Set(
      rows(s, "batch")
        .filter((x) => x.siteId === u.scope)
        .map((x) => x.id),
    );
    const receiptIds = new Set(
      rows(s, "receipt")
        .filter((x) => x.siteId === u.scope)
        .map((x) => x.id),
    );
    selected = s.filter(
      (r) =>
        ["partner", "vehicle", "project", "rule"].includes(r.kind) ||
        (r.kind === "site" && r.id === u.scope) ||
        r.siteId === u.scope ||
        batchIds.has(r.batchId) ||
        receiptIds.has(r.receiptId) ||
        (r.kind === "pickup" &&
          (r.status === "collected" ||
            rows(s, "receipt").some(
              (x) => receiptIds.has(x.id) && x.pickupId === r.id,
            ))) ||
        (r.kind === "audit" && r.actor === u.id),
    );
  } else if (u.role === "driver") {
    const ts = rows(s, "trip")
      .filter((r) => r.driverId === u.id)
      .map((r) => r.id);
    const ps = rows(s, "pickup").filter((r) => ts.includes(r.tripId));
    selected = s.filter(
      (r) =>
        r.kind === "vehicle" ||
        (r.kind === "partner" && ps.some((p) => p.partnerId === r.id)) ||
        ts.includes(r.id) ||
        ps.some((p) => p.id === r.id) ||
        (r.kind === "audit" && r.actor === u.id),
    );
  } else if (u.role === "restaurant")
    selected = s.filter(
      (r) =>
        r.id === u.scope ||
        r.partnerId === u.scope ||
        (r.kind === "audit" && r.actor === u.id),
    );
  else if (u.role === "project") {
    selected = s.filter(
      (r) =>
        r.id === u.scope ||
        r.projectId === u.scope ||
        (r.kind === "audit" && r.actor === u.id),
    );
    const batchIds = new Set(
      selected.filter((r) => r.kind === "dispatch").map((r) => r.batchId),
    );
    selected.push(
      ...rows(s, "batch")
        .filter((r) => batchIds.has(r.id))
        .map((r) => ({
          id: r.id,
          kind: "batch",
          projectId: u.scope,
          name: r.name,
          quality: r.quality,
          reason: r.reason,
          due: r.due,
        })),
    );
  }
  const ids = new Set(selected.map((r) => r.id));
  return [
    ...selected,
    ...rows(s, "attachment").filter(
      (r) => ids.has(r.targetId) && !ids.has(r.id),
    ),
  ];
}
export function apply(
  s: Row[],
  u: User,
  action: string,
  b: any,
  now = new Date(),
): { result: Row; state: Row[] } {
  const original = new Map(s.map((r) => [r.id, JSON.stringify(r)]));
  const at = now.toISOString(),
    today = at.slice(0, 10);
  const add = (kind: string, data: any): Row => {
    const r = {
      ...data,
      id:
        kind.slice(0, 3).toUpperCase() +
        "-" +
        crypto.randomUUID().slice(0, 8).toUpperCase(),
      kind,
      created: at,
    };
    s.push(r);
    return r;
  };
  const allow = (...rs: string[]) =>
    assert(u.role === "admin" || rs.includes(u.role), "当前角色无权执行此操作");
  const scoped = (r: Row) => {
    if (u.role === "restaurant")
      assert(r.partnerId === u.scope, "只能操作自己的餐厅");
    if (u.role === "operator") assert(r.siteId === u.scope, "只能操作授权场地");
    if (u.role === "project")
      assert((r.projectId || r.id) === u.scope, "只能操作授权修复项目");
  };
  const get = (kind: string) => {
    const r = find(s, str(b.id, "记录编号"), kind);
    scoped(r);
    return r;
  };
  const log = (batchId: string, delta: number, reason: string, ref: string) =>
    add("ledger", { batchId, delta, reason, ref, actor: u.id });
  const projectOpen = (id: string) =>
    assert(
      find(s, id, "project").status === "open",
      "项目已结项，不能再变更物料",
    );
  const finishTrip = (id: string) => {
    const trip = s.find((x) => x.kind === "trip" && x.id === id);
    if (trip && trip.status !== "cancelled") {
      const stops = rows(s, "pickup").filter((x) => x.tripId === id);
      trip.status = stops.some((x) => x.status === "assigned")
        ? "assigned"
        : "completed";
    }
  };
  let r: Row;
  switch (action) {
    case "pickup.import":
      allow("restaurant", "dispatcher");
      {
        assert(
          Array.isArray(b.items) && b.items.length > 0 && b.items.length <= 40,
          "每次导入 1–40 条",
        );
        const results: Row[] = [];
        for (const item of b.items) {
          const ref = str(item.externalRef, "外部编号");
          const partnerId =
            u.role === "restaurant" ? u.scope : str(item.partnerId);
          assert(
            !rows(s, "pickup").some(
              (x) => x.externalRef === ref && x.partnerId === partnerId,
            ),
            "外部编号重复：" + ref,
          );
          const created = apply(s, u, "pickup.create", item, now).result;
          created.externalRef = ref;
          results.push(created);
        }
        r = add("audit", {
          action: "import.summary",
          actor: u.id,
          actorName: u.name,
          count: results.length,
          ids: results.map((x) => x.id),
        });
        break;
      }
    case "partner.create":
      allow("dispatcher");
      r = add("partner", {
        name: str(b.name, "餐厅名称"),
        contact: str(b.contact, "联系人"),
        phone: str(b.phone, "电话"),
        address: str(b.address, "地址"),
        active: true,
      });
      break;
    case "partner.update":
      allow("dispatcher");
      r = get("partner");
      for (const k of ["name", "contact", "phone", "address"])
        r[k] = str(b[k], k);
      break;
    case "trip.cancel":
      allow("dispatcher");
      r = get("trip");
      assert(r.status === "assigned", "只能取消未结束线路");
      assert(
        !rows(s, "pickup").some(
          (p) =>
            p.tripId === r.id &&
            ["collected", "received", "rejected"].includes(p.status),
        ),
        "线路已有实际收取记录，不能整体取消",
      );
      r.status = "cancelled";
      r.reason = str(b.reason, "取消原因");
      rows(s, "pickup")
        .filter((p) => p.tripId === r.id && p.status === "assigned")
        .forEach((p) => {
          p.status = "requested";
          delete p.tripId;
        });
      break;
    case "trip.reassign":
      allow("dispatcher");
      r = get("trip");
      assert(r.status === "assigned", "线路已结束");
      assert(
        !rows(s, "pickup").some(
          (p) =>
            p.tripId === r.id &&
            ["collected", "received", "rejected"].includes(p.status),
        ),
        "已经开始收取，不能改派",
      );
      {
        const v = find(s, str(b.vehicleId), "vehicle");
        assert(v.active, "车辆已停用");
        assert(
          rows(s, "pickup")
            .filter((p) => p.tripId === r.id && p.status === "assigned")
            .reduce((n, p) => n + p.expected, 0) <= v.capacity,
          "新车辆载重不足",
        );
        r.driverId = str(b.driverId, "司机");
        r.vehicleId = v.id;
        r.reason = str(b.reason, "改派原因");
        break;
      }
    case "pickup.fail":
      allow("driver");
      r = get("pickup");
      assert(r.status === "assigned", "只能登记待收取任务失败");
      if (u.role === "driver")
        assert(find(s, r.tripId, "trip").driverId === u.id, "不是你的回收任务");
      r.status = "failed";
      r.failureReason = str(b.reason, "失败原因");
      r.failedAt = at;
      finishTrip(r.tripId);
      break;
    case "pickup.reschedule":
      allow("dispatcher");
      r = get("pickup");
      assert(
        ["requested", "failed"].includes(r.status),
        "只能重新安排待调度或收取失败申请",
      );
      r.scheduled = date(b.scheduled);
      r.reason = str(b.reason, "重新安排原因");
      r.status = "requested";
      delete r.tripId;
      break;
    case "receipt.correct":
      allow("operator");
      r = get("receipt");
      {
        const gross = grams(b.gross),
          tare = grams(b.tare, true),
          reject = grams(b.reject, true),
          accepted = gross - tare - reject;
        assert(
          gross > tare && accepted >= 0,
          "毛重必须大于皮重，拒收重量不可超过净重",
        );
        const used = rows(s, "input")
          .filter((x) => x.receiptId === r.id)
          .reduce((n, x) => n + x.qty, 0);
        assert(
          accepted >= used,
          "更正后接收量不得小于已投料量；已投料损耗请走库存调整",
        );
        assert(
          siteLoad(s, r.siteId) + accepted - r.accepted <=
            find(s, r.siteId, "site").capacity,
          "更正将超过场地容量",
        );
        add("correction", {
          receiptId: r.id,
          siteId: r.siteId,
          actor: u.id,
          reason: str(b.reason, "更正依据"),
          oldGross: r.gross,
          oldTare: r.tare,
          oldReject: r.reject,
          newGross: gross,
          newTare: tare,
          newReject: reject,
        });
        Object.assign(r, {
          gross,
          tare,
          reject,
          accepted,
          status: accepted ? "received" : "rejected",
          correctedAt: at,
        });
        find(s, r.pickupId, "pickup").status = r.status;
        break;
      }
    case "demand.close":
      allow("project", "dispatcher");
      r = get("demand");
      assert(r.status === "open", "需求已结束");
      assert(
        !rows(s, "reservation").some(
          (x) => x.demandId === r.id && x.status === "active",
        ),
        "请先完成或取消预留",
      );
      {
        const shipments = rows(s, "dispatch").filter(
          (x) => x.demandId === r.id,
        );
        assert(
          !shipments.some(
            (x) => x.status === "shipped" || projectRemaining(s, x) > 0,
          ),
          "还有未签收或未处理的项目物料",
        );
        assert(
          !rows(s, "adjustment").some(
            (x) => x.projectId === r.projectId && x.status === "pending",
          ),
          "项目尚有待复核退料",
        );
        r.fulfilled = shipments.reduce(
          (n, x) =>
            n +
            rows(s, "deployment")
              .filter((p) => p.dispatchId === x.id)
              .reduce((a, p) => a + p.qty, 0),
          0,
        );
        r.reason = str(b.reason, "需求关闭 / 差额说明");
        r.status = "closed";
        r.closedAt = at;
        break;
      }
    case "adjustment.reject":
      allow("qa");
      r = get("adjustment");
      assert(r.status === "pending", "已经审批");
      assert(r.requester !== u.id, "需要另一名用户复核");
      r.status = "rejected";
      r.reviewReason = str(b.reason, "驳回原因");
      r.approver = u.id;
      r.reviewedAt = at;
      break;
    case "adjustment.withdraw":
      r = get("adjustment");
      assert(
        u.role === "admin" || r.requester === u.id,
        "只能撤回自己申请的调整",
      );
      assert(r.status === "pending", "只能撤回待审批申请");
      r.status = "withdrawn";
      r.reviewReason = str(b.reason, "撤回原因");
      break;
    case "partner.toggle":
      allow("dispatcher");
      r = get("partner");
      r.active = !r.active;
      break;
    case "site.create":
      allow();
      r = add("site", {
        name: str(b.name, "场地名称"),
        address: str(b.address, "地址"),
        zones: str(b.zones, "区域，例如 A1,A2")
          .split(",")
          .map((x) => x.trim()),
        capacity: grams(b.capacity),
        active: true,
      });
      break;
    case "vehicle.create":
      allow("dispatcher");
      r = add("vehicle", {
        name: str(b.name, "车牌"),
        capacity: grams(b.capacity),
        active: true,
      });
      break;
    case "pickup.create":
      allow("restaurant", "dispatcher");
      {
        const p = find(
          s,
          u.role === "restaurant" ? u.scope : str(b.partnerId),
          "partner",
        );
        assert(p.active, "餐厅已停用");
        assert(
          Number.isInteger(Number(b.buckets)) &&
            Number(b.buckets) > 0 &&
            Number(b.buckets) <= 1000,
          "桶数必须为 1–1000 的整数",
        );
        r = add("pickup", {
          partnerId: p.id,
          expected: grams(b.expected),
          scheduled: date(b.scheduled),
          buckets: Number(b.buckets) || 1,
          notes: str(b.notes, "备注", false),
          status: "requested",
        });
        break;
      }
    case "pickup.cancel":
      allow("restaurant", "dispatcher");
      r = get("pickup");
      assert(
        ["requested", "assigned"].includes(r.status),
        "已收取的申请不能取消",
      );
      r.status = "cancelled";
      r.reason = str(b.reason, "取消原因");
      finishTrip(r.tripId);
      break;
    case "trip.create":
      allow("dispatcher");
      {
        const ids = Array.isArray(b.pickupIds) ? b.pickupIds : [];
        assert(ids.length > 0 && ids.length <= 30, "请选择 1–30 个回收申请");
        const vehicle = find(s, str(b.vehicleId), "vehicle");
        assert(vehicle.active, "车辆已停用");
        const ps = [...new Set(ids)].map((id) => find(s, String(id), "pickup"));
        assert(
          ps.every((p) => p.status === "requested"),
          "申请已被调度，请刷新",
        );
        assert(
          ps.reduce((a, p) => a + p.expected, 0) <= vehicle.capacity,
          "预计重量超过车辆载重",
        );
        r = add("trip", {
          name: str(b.name, "线路名称"),
          driverId: str(b.driverId, "司机"),
          vehicleId: vehicle.id,
          scheduled: date(b.scheduled),
          status: "assigned",
          pickupIds: ps.map((p) => p.id),
        });
        ps.forEach((p) => {
          p.tripId = r.id;
          p.status = "assigned";
        });
        break;
      }
    case "pickup.collect":
      allow("driver");
      r = get("pickup");
      assert(r.status === "assigned", "只可收取已调度申请");
      if (u.role === "driver")
        assert(find(s, r.tripId, "trip").driverId === u.id, "不是你的回收任务");
      r.collectedWeight = grams(b.weight);
      r.collectedAt = at;
      r.status = "collected";
      r.collectionNotes = str(b.notes, "备注", false);
      finishTrip(r.tripId);
      break;
    case "receipt.create":
      allow("operator");
      {
        const p = find(s, str(b.pickupId), "pickup");
        assert(p.status === "collected", "只能接收已收取申请");
        const site = find(s, str(b.siteId), "site");
        scoped({ id: site.id, kind: "site", siteId: site.id });
        const gross = grams(b.gross),
          tare = grams(b.tare, true),
          reject = grams(b.reject, true);
        assert(
          gross > tare && reject <= gross - tare,
          "毛重必须大于皮重，拒收重量不可超过净重",
        );
        assert(reject === 0 || str(b.reason, "拒收原因"), "填写拒收原因");
        assert(site.active, "场地已停用");
        assert(
          siteLoad(s, site.id) + gross - tare - reject <= site.capacity,
          "场地容量不足",
        );
        r = add("receipt", {
          pickupId: p.id,
          partnerId: p.partnerId,
          siteId: site.id,
          gross,
          tare,
          reject,
          accepted: gross - tare - reject,
          reason: str(b.reason, "说明", false),
          status: reject === gross - tare ? "rejected" : "received",
        });
        p.status = r.status;
        break;
      }
    case "batch.create":
      allow("operator");
      {
        const site = find(s, str(b.siteId), "site");
        scoped({ id: site.id, kind: "site", siteId: site.id });
        assert(site.zones.includes(b.zone), "请选择有效区域");
        r = add("batch", {
          name: str(b.name, "批次名称"),
          siteId: site.id,
          zone: b.zone,
          status: "assembling",
          quality: "unreleased",
        });
        break;
      }
    case "batch.input":
      allow("operator");
      r = get("batch");
      assert(r.status === "assembling", "封批后不能继续投料");
      {
        const rec = find(s, str(b.receiptId), "receipt"),
          q = grams(b.weight);
        assert(rec.siteId === r.siteId, "入库单与批次不在同一场地");
        const used = rows(s, "input")
          .filter((x) => x.receiptId === rec.id)
          .reduce((a, x) => a + x.qty, 0);
        assert(used + q <= rec.accepted, "超过入库单未分配重量");
        assert(
          siteLoad(s, r.siteId) <= find(s, r.siteId, "site").capacity,
          "场地容量不足",
        );
        const input = add("input", {
          batchId: r.id,
          receiptId: rec.id,
          qty: q,
        });
        log(r.id, q, "入库投料", input.id);
        break;
      }
    case "batch.seal":
      allow("operator");
      r = get("batch");
      assert(
        r.status === "assembling" && stock(s, r.id).onhand > 0,
        "仅有投料的组批批次可以封批",
      );
      {
        const rule = rows(s, "rule")[0];
        r.status = "curing";
        r.sealedAt = today;
        r.days = rule.days;
        r.ruleVersion = rule.version;
        r.due = new Date(now.getTime() + rule.days * 86400000)
          .toISOString()
          .slice(0, 10);
        break;
      }
    case "batch.inspect":
      allow("qa");
      r = get("batch");
      assert(r.status === "curing", "批次尚未封批");
      assert(["pass", "fail"].includes(b.result), "检验结果无效");
      add("inspection", {
        batchId: r.id,
        result: b.result,
        notes: str(b.notes, "检验记录"),
        actor: u.id,
        sequence:
          rows(s, "inspection").filter((x) => x.batchId === r.id).length + 1,
      });
      if (b.result === "fail") {
        r.quality = "quarantined";
        r.reason = b.notes;
      }
      break;
    case "batch.release":
      allow("qa");
      r = get("batch");
      assert(
        r.status === "curing" && r.due <= today,
        "尚未达到熟化期限，不能放行",
      );
      {
        const ins = rows(s, "inspection")
          .filter((x) => x.batchId === r.id)
          .sort(
            (a, b) =>
              (a.sequence || 0) - (b.sequence || 0) ||
              String(a.created).localeCompare(String(b.created)) ||
              a.id.localeCompare(b.id),
          )
          .at(-1);
        assert(
          ins?.result === "pass" &&
            rows(s, "inspection").filter((x) => x.batchId === r.id).length >
              (r.inspectionsAtHold || 0),
          "须先录入隔离后的合格检验记录",
        );
        assert(r.quality !== "scrapped", "已报废批次不可放行");
        r.quality = "released";
        r.releasedAt = at;
        break;
      }
    case "batch.quarantine":
      allow("qa");
      r = get("batch");
      assert(r.quality !== "scrapped", "批次已报废");
      r.quality = "quarantined";
      r.inspectionsAtHold = rows(s, "inspection").filter(
        (x) => x.batchId === r.id,
      ).length;
      r.reason = str(b.reason, "隔离原因");
      break;
    case "project.create":
      allow();
      r = add("project", {
        name: str(b.name, "项目名称"),
        location: str(b.location, "修复地点"),
        target: grams(b.target),
        manager: str(b.manager, "负责人"),
        status: "open",
      });
      break;
    case "project.close":
      allow("project");
      r = get("project");
      assert(r.status === "open", "项目已结项");
      assert(
        !rows(s, "demand").some(
          (x) => x.projectId === r.id && x.status === "open",
        ),
        "还有未关闭物料需求",
      );
      assert(
        !rows(s, "adjustment").some(
          (x) => x.projectId === r.id && x.status === "pending",
        ),
        "还有待复核项目退料",
      );
      assert(
        !rows(s, "reservation").some(
          (x) => x.projectId === r.id && x.status === "active",
        ),
        "还有未完成库存预留",
      );
      assert(
        !rows(s, "dispatch").some(
          (x) =>
            x.projectId === r.id &&
            (x.status === "shipped" || projectRemaining(s, x) > 0),
        ),
        "还有待签收或待投放物料",
      );
      r.status = "closed";
      r.closedAt = at;
      r.closeReason = str(b.reason, "结项总结");
      break;
    case "demand.create":
      allow("project");
      {
        const p = find(
          s,
          u.role === "project" ? u.scope : str(b.projectId),
          "project",
        );
        assert(p.status === "open", "项目已结项");
        r = add("demand", {
          projectId: p.id,
          qty: grams(b.weight),
          due: date(b.due),
          notes: str(b.notes, "备注", false),
          status: "open",
        });
        break;
      }
    case "demand.cancel":
      allow("project", "dispatcher");
      r = get("demand");
      assert(
        !rows(s, "reservation").some(
          (x) => x.demandId === r.id && x.status === "active",
        ),
        "请先取消预留",
      );
      assert(
        !rows(s, "dispatch").some((x) => x.demandId === r.id),
        "已发运的需求不能取消",
      );
      r.status = "cancelled";
      break;
    case "reservation.create":
      allow("dispatcher");
      {
        const d = find(s, str(b.demandId), "demand"),
          batch = find(s, str(b.batchId), "batch"),
          q = grams(b.weight);
        assert(d.status === "open", "需求已关闭");
        projectOpen(d.projectId);
        assert(stock(s, batch.id).available >= q, "可用库存不足或批次未放行");
        const allocated = rows(s, "reservation")
          .filter((x) => x.demandId === d.id)
          .reduce(
            (a, x) => a + (x.status === "cancelled" ? x.shipped : x.qty),
            0,
          );
        assert(allocated + q <= d.qty, "超过需求未分配重量");
        r = add("reservation", {
          demandId: d.id,
          projectId: d.projectId,
          batchId: batch.id,
          qty: q,
          shipped: 0,
          status: "active",
        });
        break;
      }
    case "reservation.cancel":
      allow("dispatcher");
      r = get("reservation");
      assert(r.status === "active", "该预留已结束");
      r.status = "cancelled";
      r.reason = str(b.reason, "取消原因");
      break;
    case "dispatch.create":
      allow("dispatcher", "operator");
      {
        const rs = find(s, str(b.reservationId), "reservation"),
          ba = find(s, rs.batchId, "batch");
        scoped(ba);
        projectOpen(rs.projectId);
        assert(find(s, rs.demandId, "demand").status === "open", "需求已关闭");
        const q = grams(b.weight);
        assert(
          rs.status === "active" && q <= rs.qty - rs.shipped,
          "超过剩余预留重量",
        );
        assert(ba.quality === "released", "批次未放行或已隔离，禁止发运");
        assert(q <= stock(s, ba.id).onhand, "实物库存不足");
        r = add("dispatch", {
          reservationId: rs.id,
          demandId: rs.demandId,
          projectId: rs.projectId,
          batchId: ba.id,
          siteId: ba.siteId,
          qty: q,
          vehicle: str(b.vehicle, "运输车辆"),
          status: "shipped",
        });
        rs.shipped += q;
        if (rs.shipped === rs.qty) rs.status = "completed";
        log(ba.id, -q, "项目发运", r.id);
        break;
      }
    case "dispatch.receive":
      allow("project");
      r = get("dispatch");
      assert(r.status === "shipped", "此发运已签收");
      {
        const q = grams(b.weight, true);
        assert(q <= r.qty, "签收量不得超过发运量");
        assert(q === r.qty || str(b.reason, "差异说明"), "请填写差异说明");
        r.received = q;
        r.receivedAt = at;
        r.reason = str(b.reason, "差异说明", false);
        r.status = "received";
        break;
      }
    case "deployment.create":
      allow("project");
      {
        const d = find(s, str(b.dispatchId), "dispatch");
        scoped(d);
        projectOpen(d.projectId);
        assert(
          find(s, d.batchId, "batch").quality === "released",
          "来源批次已隔离或报废，暂停投放并联系质量员",
        );
        assert(d.status === "received", "请先签收");
        const q = grams(b.weight);
        const used = rows(s, "deployment")
          .filter((x) => x.dispatchId === d.id)
          .reduce((a, x) => a + x.qty, 0);
        assert(
          used + q + returned(s, d.id, true) <= d.received,
          "超过已签收未投放重量（待审批退料也占用额度）",
        );
        assert(date(b.date) <= today, "投放日期不能在未来");
        r = add("deployment", {
          dispatchId: d.id,
          batchId: d.batchId,
          projectId: d.projectId,
          qty: q,
          date: date(b.date),
          location: str(b.location, "投放点"),
          notes: str(b.notes, "记录", false),
        });
        break;
      }
    case "adjustment.create":
      allow("operator");
      {
        const ba = find(s, str(b.batchId), "batch");
        scoped(ba);
        assert(["loss", "scrap", "return"].includes(b.type), "调整类型无效");
        const q = grams(b.weight);
        let source: Row | undefined;
        if (b.type === "return") {
          source = find(s, str(b.dispatchId, "原发运单"), "dispatch");
          assert(
            source.batchId === ba.id && source.status === "received",
            "退料必须来自本批次已签收发运单",
          );
          projectOpen(source.projectId);
          assert(
            q <= projectRemaining(s, source),
            "超过原发运单尚未投放 / 退回的重量",
          );
        }
        r = add("adjustment", {
          dispatchId: source?.id,
          projectId: source?.projectId,
          batchId: ba.id,
          siteId: ba.siteId,
          type: b.type,
          qty: grams(b.weight),
          reason: str(b.reason, "调整依据"),
          status: "pending",
          requester: u.id,
        });
        break;
      }
    case "adjustment.approve":
      allow("qa");
      r = get("adjustment");
      assert(r.status === "pending", "已经审批");
      assert(r.requester !== u.id, "需要另一名用户复核");
      {
        const ba = find(s, r.batchId, "batch"),
          st = stock(s, ba.id);
        if (r.type === "return") {
          const source = find(s, r.dispatchId, "dispatch");
          assert(
            source.batchId === ba.id && source.status === "received",
            "退料来源无效",
          );
          assert(projectRemaining(s, source) >= 0, "退料重量已被其他操作占用");
          assert(
            siteLoad(s, ba.siteId) + r.qty <=
              find(s, ba.siteId, "site").capacity,
            "退料超过场地容量",
          );
          ba.quality = "quarantined";
          ba.inspectionsAtHold = rows(s, "inspection").filter(
            (i) => i.batchId === ba.id,
          ).length;
          ba.reason = "退回物料重新入场，须复检放行";
        }
        assert(
          r.type === "return" || r.qty <= st.onhand - st.held,
          "库存不足或已有预留，请先解除预留",
        );
        log(
          ba.id,
          r.type === "return" ? r.qty : -r.qty,
          `审批调整:${r.type}`,
          r.id,
        );
        r.status = "approved";
        r.approver = u.id;
        r.reviewedAt = at;
        if (stock(s, ba.id).onhand === 0 && r.type === "scrap")
          ba.quality = "scrapped";
        break;
      }
    case "rule.update":
      allow();
      r = rows(s, "rule")[0];
      add("ruleHistory", {
        days: r.days,
        version: r.version,
        reason: r.reason,
        actor: u.id,
      });
      assert(
        Number.isInteger(Number(b.days)) &&
          Number(b.days) >= 1 &&
          Number(b.days) <= 1095,
        "熟化天数为 1–1095 的整数",
      );
      r.days = Number(b.days);
      r.version++;
      r.reason = str(b.reason, "变更依据");
      break;
    default:
      throw new Error("未知业务操作");
  }
  const changes = s
    .filter(
      (x) => x.kind !== "audit" && original.get(x.id) !== JSON.stringify(x),
    )
    .map((x) => ({
      id: x.id,
      kind: x.kind,
      before: original.has(x.id) ? JSON.parse(original.get(x.id)!) : null,
      after: { ...x },
    }));
  add("audit", {
    action,
    target: r.id,
    actor: u.id,
    actorName: u.name,
    details: JSON.stringify(b).slice(0, 3000),
    changes,
  });
  return { result: r, state: s };
}
