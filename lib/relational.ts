import { entityDefinitions } from "./entity-definitions";
import type { Row } from "./domain";

type Database = D1Database;
const quote = (s: string) => `"${s}"`;
export function relationalWrites(db: Database, state: Row[]) {
  const statements: D1PreparedStatement[] = [];
  for (const def of entityDefinitions) {
    const selected = state.filter((r) => r.kind === def.kind);
    const fields = def.fields as readonly { name: string; type: string }[];
    const names = ["id", "created", "extra", ...fields.map((f) => f.name)];
    const known = new Set([
      "id",
      "kind",
      "created",
      ...fields.map((f) => f.name),
    ]);
    const encoded = selected.map((row) => [
      row.id,
      row.created ?? null,
      JSON.stringify(
        Object.fromEntries(Object.entries(row).filter(([k]) => !known.has(k))),
      ),
      ...fields.map((f) => {
        const v = row[f.name];
        if (v === undefined || v === null) return null;
        return f.type.replace("?", "") === "j"
          ? JSON.stringify(v)
          : f.type.replace("?", "") === "b"
            ? Number(Boolean(v))
            : v;
      }),
    ]);
    const chunk = Math.floor(90 / names.length);
    for (let i = 0; i < encoded.length; i += chunk) {
      const group = encoded.slice(i, i + chunk);
      statements.push(
        db
          .prepare(
            `INSERT INTO ${quote(def.table)} (${names.map(quote).join(",")}) VALUES ${group.map(() => `(${names.map(() => "?").join(",")})`).join(",")} ON CONFLICT(id) DO UPDATE SET ${names
              .slice(1)
              .map((n) => `${quote(n)}=excluded.${quote(n)}`)
              .join(",")}`,
          )
          .bind(...group.flat()),
      );
    }
  }
  return statements;
}

export async function ensureRelational(db: Database) {
  // Old releases continue to dual-write the legacy snapshot during the rollout.
  // A revision gate makes reconciliation atomic, repeatable and safe under concurrency.
  for (let attempt = 0; attempt < 3; attempt++) {
    const marker = await db
      .prepare(
        "SELECT b.version AS source,r.version AS target FROM business_revision b LEFT JOIN relational_revision r ON r.id=b.id WHERE b.id=1",
      )
      .first<{ source: number; target: number | null }>();
    if (marker && marker.source === marker.target) return;
    const legacy = await db
      .prepare(
        "SELECT kind,data FROM business_records UNION ALL SELECT '__revision',CAST(version AS TEXT) FROM business_revision WHERE id=1",
      )
      .all<{ kind: string; data: string }>();
    const version = Number(
      legacy.results.find((r) => r.kind === "__revision")?.data || 0,
    );
    const state = legacy.results
      .filter((r) => r.kind !== "__revision")
      .map((r) => JSON.parse(r.data) as Row);
    const unknown = state.filter(
      (r) => !entityDefinitions.some((d) => d.kind === r.kind),
    );
    if (unknown.length)
      throw new Error("数据升级遇到未知记录类型，已保留原数据，请联系管理员");
    const key = "migrate-" + crypto.randomUUID();
    try {
      await db.batch([
        db
          .prepare(
            "INSERT INTO transaction_guard(id,valid) VALUES(?,CASE WHEN (SELECT version FROM business_revision WHERE id=1)=? THEN 1 ELSE NULL END)",
          )
          .bind(key, version),
        ...relationalWrites(db, state),
        db
          .prepare(
            "INSERT INTO relational_revision(id,version,migrated_at) VALUES(1,?,?) ON CONFLICT(id) DO UPDATE SET version=excluded.version,migrated_at=excluded.migrated_at",
          )
          .bind(version, new Date().toISOString()),
        db.prepare("DELETE FROM transaction_guard WHERE id=?").bind(key),
      ]);
      return;
    } catch (e) {
      if (!String(e).includes("transaction_guard")) throw e;
    }
  }
  throw new Error("数据升级期间有并发操作，请稍后重试");
}

export async function relationalSnapshot(
  db: Database,
): Promise<{ version: number; state: Row[] }> {
  await ensureRelational(db);
  const projections = entityDefinitions.map(
    (def) =>
      `(SELECT json_group_array(json_object('id',id,'created',created,'extra',extra,${def.fields.map((f) => `'${f.name}',${quote(f.name)}`).join(",")})) FROM ${quote(def.table)}) AS ${quote(def.kind)}`,
  );
  const result = await db
    .prepare(
      `SELECT ${projections.join(",")},(SELECT version FROM business_revision WHERE id=1) AS revision,(SELECT version FROM relational_revision WHERE id=1) AS normalized`,
    )
    .first<Record<string, any>>();
  if (!result) throw new Error("读取数据快照失败");
  if (result.revision !== result.normalized) return relationalSnapshot(db);
  const state: Row[] = [];
  for (const def of entityDefinitions)
    for (const raw of JSON.parse(result[def.kind] || "[]")) {
      const row: Row = { ...JSON.parse(raw.extra), id: raw.id, kind: def.kind };
      if (raw.created !== null) row.created = raw.created;
      for (const f of def.fields) {
        if (raw[f.name] === null) continue;
        const type = f.type.replace("?", "");
        row[f.name] =
          type === "j"
            ? JSON.parse(raw[f.name])
            : type === "b"
              ? Boolean(raw[f.name])
              : raw[f.name];
      }
      state.push(row);
    }
  return { version: Number(result.revision || 0), state };
}
