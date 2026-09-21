"use client";
import { useMemo, useState } from "react";
import { Row, rows, qty } from "@/lib/domain";
import { businessDate } from "@/lib/business-date";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
export default function OperationsReport({ records: s }: { records: Row[] }) {
  const today = businessDate();
  const [from, setFrom] = useState(today.slice(0, 7) + "-01"),
    [to, setTo] = useState(today);
  const report = useMemo(() => {
    const dateOf = (r: Row) =>
      businessDate(r.kind === "deployment" ? r.date : r.created || "");
    const selected = s.filter((r) => dateOf(r) >= from && dateOf(r) <= to);
    const receipts = rows(selected, "receipt"),
      dispatches = rows(selected, "dispatch"),
      deployments = rows(selected, "deployment");
    const group = new Map<
      string,
      {
        date: string;
        accepted: number;
        rejected: number;
        shipped: number;
        deployed: number;
      }
    >();
    for (const r of [...receipts, ...dispatches, ...deployments]) {
      const date = dateOf(r),
        g = group.get(date) || {
          date,
          accepted: 0,
          rejected: 0,
          shipped: 0,
          deployed: 0,
        };
      if (r.kind === "receipt") {
        g.accepted += r.accepted;
        g.rejected += r.reject;
      }
      if (r.kind === "dispatch") g.shipped += r.qty;
      if (r.kind === "deployment") g.deployed += r.qty;
      group.set(date, g);
    }
    return {
      receipts,
      dispatches,
      deployments,
      daily: [...group.values()].sort((a, b) => b.date.localeCompare(a.date)),
      accepted: receipts.reduce((n, r) => n + r.accepted, 0),
      reject: receipts.reduce((n, r) => n + r.reject, 0),
      shipped: dispatches.reduce((n, r) => n + r.qty, 0),
      deployed: deployments.reduce((n, r) => n + r.qty, 0),
    };
  }, [s, from, to]);
  const exportReport = () => {
    const lines = [
      "日期,有效接收kg,拒收kg,发运kg,投放kg",
      ...report.daily.map((r) =>
        [
          r.date,
          r.accepted / 1000,
          r.rejected / 1000,
          r.shipped / 1000,
          r.deployed / 1000,
        ].join(","),
      ),
    ];
    const url = URL.createObjectURL(
        new Blob(["\ufeff" + lines.join("\r\n")], {
          type: "text/csv;charset=utf-8",
        }),
      ),
      a = document.createElement("a");
    a.href = url;
    a.download = `ShellCycle-业务日报-${from}-${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <section className="panel report">
      <div className="panel-heading">
        <h3>区间业务日报</h3>
        <Button
          variant="outline"
          disabled={from > to || !report.daily.length}
          onClick={exportReport}
        >
          导出当前区间
        </Button>
      </div>
      <form className="report-filters" onSubmit={(e) => {
        e.preventDefault();
        const range = new FormData(e.currentTarget);
        setFrom(String(range.get('from')));
        setTo(String(range.get('to')));
      }}>
        <label>
          开始日期
          <Input
            type="date"
            name="from"
            required
            defaultValue={from}
          />
        </label>
        <label>
          结束日期
          <Input
            type="date"
            name="to"
            required
            defaultValue={to}
          />
        </label>
        <Button type="submit" className="self-end">应用区间</Button>
      </form>
      <p className="note" role="status">已应用区间：{from} 至 {to}</p>
      {from > to ? (
        <p className="form-error">开始日期不能晚于结束日期。</p>
      ) : (
        <>
          <div className="stats">
            {[
              ["有效接收", report.accepted],
              ["拒收杂物", report.reject],
              ["安排发运", report.shipped],
              ["现场投放", report.deployed],
            ].map(([label, v]) => (
              <div className="stat" key={String(label)}>
                <p>{label}</p>
                <strong>
                  {qty(Number(v))}
                  <small> kg</small>
                </strong>
              </div>
            ))}
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                {["日期", "有效接收 kg", "拒收 kg", "发运 kg", "投放 kg"].map(
                  (x) => (
                    <TableHead key={x}>{x}</TableHead>
                  ),
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {report.daily.map((r) => (
                <TableRow key={r.date}>
                  <TableCell>{r.date}</TableCell>
                  <TableCell>{qty(r.accepted)}</TableCell>
                  <TableCell>{qty(r.rejected)}</TableCell>
                  <TableCell>{qty(r.shipped)}</TableCell>
                  <TableCell>{qty(r.deployed)}</TableCell>
                </TableRow>
              ))}
              {!report.daily.length && (
                <TableRow>
                  <TableCell colSpan={5}>
                    此区间内没有授权范围内的业务记录。
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </>
      )}
      <p className="note">
        口径：接收按入库创建日、发运按发运创建日、投放按现场业务日期统计；显示现行更正后重量。库存余额不按日期截断，也不将未签收运输差异提前计入损耗。日期按
        UTC 存储。
      </p>
    </section>
  );
}
