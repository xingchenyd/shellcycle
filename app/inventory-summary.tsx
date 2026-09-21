"use client";
import { Row, rows, qty, stock, siteLoad, labels } from "@/lib/domain";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
export default function InventorySummary({
  records: s,
  onDetail,
}: {
  records: Row[];
  onDetail: (r: Row) => void;
}) {
  const batches = rows(s, "batch"),
    sites = rows(s, "site");
  return (
    <>
      <div className="stats capacity-stats">
        {sites.map((site) => {
          const load = siteLoad(s, site.id);
          return (
            <section className="stat" key={site.id}>
              <p>{site.name}</p>
              <strong>
                {qty(load)} <small>kg</small>
              </strong>
              <small>
                容量 {qty(site.capacity)} kg · 使用{" "}
                {Math.round((load / site.capacity) * 100)}%<br />
                含待组批接收物料与批次实物库存
              </small>
            </section>
          );
        })}
      </div>
      <section className="panel table-panel">
        <div className="panel-heading">
          <h3>批次库存余额</h3>
          <span className="muted">预留不扣实物；发运才扣减</span>
        </div>
        <div className="inventory-scroll">
          <Table>
            <TableHeader>
              <TableRow>
                {[
                  "批次",
                  "质量状态",
                  "实物 kg",
                  "预留 kg",
                  "可分配 kg",
                  "核对",
                ].map((x) => (
                  <TableHead key={x}>{x}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {batches.map((b) => {
                const st = stock(s, b.id);
                return (
                  <TableRow key={b.id}>
                    <TableCell>
                      <button
                        className="relation-link"
                        onClick={() => onDetail(b)}
                      >
                        {b.name}
                      </button>
                      <small>{b.id}</small>
                    </TableCell>
                    <TableCell>{labels[b.quality] || "待放行"}</TableCell>
                    <TableCell>{qty(st.onhand)}</TableCell>
                    <TableCell>{qty(st.held)}</TableCell>
                    <TableCell>{qty(st.available)}</TableCell>
                    <TableCell>
                      {st.onhand < 0 || st.held > st.onhand ? (
                        <span className="negative">余额异常，请复核</span>
                      ) : (
                        <span className="positive">平衡</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </section>
    </>
  );
}
