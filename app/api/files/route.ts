import { relationalWrites } from "@/lib/relational";
import { env } from "cloudflare:workers";
import { user, snapshot, db, response, fail } from "@/lib/server";
import { visible, assert } from "@/lib/domain";
import { readBody } from "@/lib/request";
export async function POST(req: Request) {
  try {
    const u = await user(req);
    assert(
      req.headers.get("origin") === new URL(req.url).origin,
      "不允许跨站上传",
    );
    assert(
      Number(req.headers.get("content-length") || 0) < 5500000,
      "文件最多 5 MB",
    );
    const bytesBody = await readBody(req, 5500000);
    const f = await new Response(bytesBody, { headers: { "Content-Type": req.headers.get("content-type") || "" } }).formData(),
      file = f.get("file") as File,
      target = String(f.get("targetId"));
    assert(
      file instanceof File && file.size > 0 && file.size <= 5000000,
      "请选择 5 MB 以内文件",
    );
    assert(
      ["image/jpeg", "image/png", "image/webp", "application/pdf"].includes(
        file.type,
      ),
      "仅支持 JPG、PNG、WebP、PDF",
    );
    const snap = await snapshot();
    assert(
      visible(snap.state, u).some((x) => x.id === target),
      "无权访问该记录",
    );
    assert(env.BUCKET, "文件存储暂不可用");
    const id = "ATT-" + crypto.randomUUID(),
      key = id;
    const bytes = new Uint8Array(await file.arrayBuffer());
    const prefix = (...values: number[]) =>
      values.every((v, i) => bytes[i] === v);
    const valid =
      file.type === "application/pdf"
        ? prefix(37, 80, 68, 70, 45)
        : file.type === "image/png"
          ? prefix(137, 80, 78, 71, 13, 10, 26, 10)
          : file.type === "image/jpeg"
            ? prefix(255, 216, 255)
            : prefix(82, 73, 70, 70) &&
              new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP";
    assert(valid, "文件内容与声明类型不符");
    await env.BUCKET.put(key, bytes, {
      httpMetadata: { contentType: file.type },
    });
    const r = {
      id,
      kind: "attachment",
      targetId: target,
      name: file.name.slice(0, 150),
      size: file.size,
      mime: file.type,
      actor: u.id,
      created: new Date().toISOString(),
    };
    const audit = {
      id: "AUD-" + crypto.randomUUID(),
      kind: "audit",
      action: "attachment.upload",
      target: target,
      actor: u.id,
      actorName: u.name,
      details: JSON.stringify({ attachmentId: id, name: r.name, size: r.size }),
      created: r.created,
    };
    try {
      await db().batch([
        db()
          .prepare(
            "INSERT INTO transaction_guard(id,valid) VALUES(?,CASE WHEN (SELECT version FROM business_revision WHERE id=1)=? THEN 1 ELSE NULL END)",
          )
          .bind(id, snap.version),
        db()
          .prepare("INSERT INTO business_records(id,kind,data) VALUES(?,?,?)")
          .bind(id, "attachment", JSON.stringify(r)),
        db()
          .prepare("INSERT INTO business_records(id,kind,data) VALUES(?,?,?)")
          .bind(audit.id, audit.kind, JSON.stringify(audit)),
        ...relationalWrites(db(), [r, audit]),
        db().prepare(
          "UPDATE business_revision SET version=version+1 WHERE id=1",
        ),
        db()
          .prepare("UPDATE relational_revision SET version=? WHERE id=1")
          .bind(snap.version + 1),
        db().prepare("DELETE FROM transaction_guard WHERE id=?").bind(id),
      ]);
    } catch (e) {
      await env.BUCKET.delete(key);
      throw e;
    }
    return response(r);
  } catch (e) {
    return fail(e);
  }
}
export async function GET(req: Request) {
  try {
    const u = await user(req),
      id = new URL(req.url).searchParams.get("id"),
      snap = await snapshot(),
      a = snap.state.find((r) => r.id === id && r.kind === "attachment");
    assert(
      a && visible(snap.state, u).some((x) => x.id === a.targetId),
      "无权访问文件",
    );
    const file = await env.BUCKET?.get(a.id);
    assert(file, "文件不存在");
    return new Response(file.body, {
      headers: {
        "Content-Type": a.mime,
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(a.name)}`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (e) {
    return fail(e);
  }
}
