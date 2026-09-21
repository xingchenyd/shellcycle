"use client";
import { Row, qty, labels, stock, projectRemaining } from "@/lib/domain";
import { fieldNames, actionNames } from "@/lib/presentation";
const weights = new Set([
  "qty",
  "accepted",
  "received",
  "gross",
  "tare",
  "reject",
  "expected",
  "collectedWeight",
  "capacity",
  "target",
  "shipped",
  "delta",
  "fulfilled",
  "oldGross",
  "oldTare",
  "oldReject",
  "newGross",
  "newTare",
  "newReject",
]);
const extraNames: Record<string, string> = {
  failureReason: "收取失败原因",
  failedAt: "失败时间",
  collectionNotes: "现场收取说明",
  correctedAt: "最近称重更正",
  closedAt: "关闭时间",
  closeReason: "结项总结",
  reviewReason: "复核意见",
  reviewedAt: "复核时间",
  sequence: "检验序号",
  fulfilled: "实际投放",
  changes: "变更明细",
};
export default function RecordDetails({
  record: r,
  records: s,
  users,
  onSelect,
}: {
  record: Row;
  records: Row[];
  users: any[];
  onSelect: (r: Row) => void;
}) {
  const byId = new Map(s.map((x) => [x.id, x]));
  const name = (id: string) =>
    byId.get(id)?.name || users.find((x) => x.id === id)?.name || id;
  const related = s.filter(
    (x) =>
      x.id !== r.id &&
      x.kind !== "audit" &&
      x.kind !== "attachment" &&
      Object.entries(x).some(([k, v]) => k.endsWith("Id") && v === r.id),
  );
  const events = s
    .filter(
      (x) =>
        x.kind === "audit" &&
        (x.target === r.id || x.changes?.some((c: any) => c.id === r.id)),
    )
    .sort((a, b) => String(b.created).localeCompare(String(a.created)));
  return (
    <>
      <dl>
        {Object.entries(r)
          .filter(([k]) => !["id", "kind", "changes", "pickupIds"].includes(k))
          .map(([k, v]) => (
            <div key={k}>
              <dt>
                {(fieldNames[k] || extraNames[k] || k).replace(
                  "（克）",
                  "（kg）",
                )}
              </dt>
              <dd>
                {weights.has(k) && typeof v === "number" ? (
                  qty(v)
                ) : k.endsWith("Id") && byId.has(v) ? (
                  <button
                    className="relation-link"
                    onClick={() => onSelect(byId.get(v)!)}
                  >
                    {name(v)} · {v}
                  </button>
                ) : k === "details" ? (
                  <pre className="audit-json">
                    {(() => {
                      try {
                        return JSON.stringify(JSON.parse(v), null, 2);
                      } catch {
                        return String(v);
                      }
                    })()}
                  </pre>
                ) : typeof v === "object" ? (
                  JSON.stringify(v)
                ) : typeof v === "boolean" ? (
                  v ? (
                    "是"
                  ) : (
                    "否"
                  )
                ) : (
                  actionNames[String(v)] ||
                  labels[String(v)] ||
                  (["actor", "requester", "approver"].includes(k)
                    ? name(v)
                    : String(v ?? "—"))
                )}
              </dd>
            </div>
          ))}
      </dl>
      {r.kind === "batch" && (
        <p className="note">
          实物 {qty(stock(s, r.id).onhand)} kg · 预留 {qty(stock(s, r.id).held)}{" "}
          kg · 可分配 {qty(stock(s, r.id).available)} kg
        </p>
      )}
      {r.kind === "dispatch" && r.status === "received" && (
        <p className="note">
          待处理物料 {qty(projectRemaining(s, r))}{" "}
          kg（已扣除投放和待审批退料）。
        </p>
      )}
      {r.kind === "trip" && (
        <section className="detail-related">
          <h3>停靠顺序</h3>
          {(r.pickupIds || []).map((id: string, i: number) => (
            <button
              key={id}
              disabled={!byId.has(id)}
              onClick={() => byId.has(id) && onSelect(byId.get(id)!)}
            >
              {i + 1}. {name(byId.get(id)?.partnerId)} · {id}
            </button>
          ))}
        </section>
      )}
      {related.length > 0 && (
        <section className="detail-related">
          <h3>关联单据 · {related.length}</h3>
          {related.map((x) => (
            <button key={x.id} onClick={() => onSelect(x)}>
              {x.name || x.id} ·{" "}
              {labels[x.status] || labels[x.result] || x.kind}
              {x.qty != null ? " · " + qty(x.qty) + " kg" : ""}
            </button>
          ))}
        </section>
      )}
      {r.kind === "audit" && r.changes?.length > 0 && (
        <section>
          <h3>变更前后</h3>
          {r.changes.map((c: any) => (
            <details key={c.id}>
              <summary>
                {c.id} · {c.before ? "更新" : "新增"}
              </summary>
              <pre className="audit-json">
                {JSON.stringify({ 变更前: c.before, 变更后: c.after }, null, 2)}
              </pre>
            </details>
          ))}
        </section>
      )}
      {events.length > 0 && (
        <section className="detail-related timeline">
          <h3>操作时间线</h3>
          {events.map((e) => (
            <button key={e.id} onClick={() => onSelect(e)}>
              <strong>{actionNames[e.action] || e.action}</strong>
              <small>
                {e.actorName} · {e.created?.replace("T", " ").slice(0, 19)} UTC
              </small>
            </button>
          ))}
        </section>
      )}
    </>
  );
}
