"use client";
import { useState, useEffect } from "react";
import { Download, Shell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Row, rows } from "@/lib/domain";
import { gridRecords } from "@/lib/grid-data";
export default function BusinessGrid({
  kind,
  title,
  compact = false,
  records,
  query,
  filter,
  sort,
  name,
  columns,
  onDetail,
  rowActions,
  csv,
}: {
  kind: string;
  title?: string;
  compact?: boolean;
  records: Row[];
  query: string;
  filter: string;
  sort: string;
  name: (id: string) => string;
  columns: Record<string, [string, (r: Row) => React.ReactNode][]>;
  onDetail: (r: Row) => void;
  rowActions: (r: Row) => { label: string; run: () => void }[];
  csv: (kind: string) => void;
}) {
  const [pg, setPg] = useState(1);
  useEffect(() => setPg(1), [kind, query, filter, sort]);
  const setDetail = onDetail;
  const rr = gridRecords(records, kind, query, compact ? 'all' : filter, sort, name);
  const pages = Math.max(1, Math.ceil(rr.length / 12)),
    current = Math.min(pg, pages);
  const shown = compact
    ? rr.slice(0, 6)
    : rr.slice((current - 1) * 12, current * 12);
  return (
    <section className="panel table-panel">
      {title && (
        <div className="panel-heading">
          <h3>
            {title} <span className="count">{rr.length}</span>
          </h3>
          <Button variant="ghost" size="sm" onClick={() => csv(kind)}>
            <Download size={15} /> 导出
          </Button>
        </div>
      )}
      <Table>
        <TableHeader>
          <TableRow>
            {columns[kind]?.map((c) => (
              <TableHead key={c[0]}>{c[0]}</TableHead>
            ))}
            <TableHead className="text-right">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {shown.map((r) => (
            <TableRow key={r.id}>
              {columns[kind]?.map((c) => (
                <TableCell key={c[0]}>{c[1](r)}</TableCell>
              ))}
              <TableCell>
                <div className="row-actions">
                  <button onClick={() => setDetail(r)}>详情</button>
                  {rowActions(r).map((a) => (
                    <button key={a.label} onClick={a.run}>
                      {a.label}
                    </button>
                  ))}
                </div>
              </TableCell>
            </TableRow>
          ))}
          {!shown.length && (
            <TableRow>
              <TableCell colSpan={8}>
                <div className="empty">
                  <Shell size={28} />
                  <p>暂无符合条件的记录</p>
                  <span>调整筛选条件，或创建新的业务记录。</span>
                </div>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      {!compact && (
        <div className="pager">
          <span>
            共 {rr.length} 条 · 第 {current} / {pages} 页
          </span>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              disabled={current === 1}
              onClick={() => setPg(current - 1)}
            >
              上一页
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={current === pages}
              onClick={() => setPg(current + 1)}
            >
              下一页
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
