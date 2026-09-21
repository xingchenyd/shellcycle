import { db, snapshot, digest, password } from "./server";
import { assert, str, roles, User, find, Row } from "./domain";
import { relationalWrites } from "./relational";
export async function changeAccount(
  u: User,
  action: string,
  x: any,
  key: string,
) {
  assert(u.role === "admin", "无权管理账号");
  assert(/^[\w-]{10,100}$/.test(key), "缺少有效操作标识");
  const d = db(),
    fingerprint = await digest(JSON.stringify({ action, data: x }));
  const prior = await d
    .prepare(
      "SELECT c.user_id,c.result,f.fingerprint FROM commands c JOIN command_fingerprints f ON f.id=c.id WHERE c.id=?",
    )
    .bind(key)
    .first<any>();
  if (prior) {
    assert(
      prior.user_id === u.id && prior.fingerprint === fingerprint,
      "操作标识冲突",
    );
    return JSON.parse(prior.result);
  }
  const snap = await snapshot(),
    at = new Date().toISOString(),
    statements: D1PreparedStatement[] = [];
  let safe: any;
  if (action === "user.create") {
    assert(roles[x.role] && x.role !== "admin", "请选择业务角色");
    assert(
      /^[a-z][a-z0-9_]{2,30}$/.test(x.username),
      "账号须为 3–31 位英文、数字或下划线",
    );
    assert(
      typeof x.password === "string" &&
        x.password.length >= 12 &&
        x.password.length <= 128,
      "密码须为 12–128 位",
    );
    const scope = str(x.scope, "授权范围"),
      kind = (
        {
          restaurant: "partner",
          operator: "site",
          project: "project",
        } as Record<string, string>
      )[x.role];
    if (kind) find(snap.state, scope, kind);
    else assert(scope === "all", "此业务角色授权范围应为 all");
    assert(
      !(await d
        .prepare("SELECT id FROM users WHERE username=?")
        .bind(x.username)
        .first()),
      "登录账号已存在",
    );
    const salt = crypto.randomUUID(),
      id = "USR-" + crypto.randomUUID();
    safe = {
      id,
      username: x.username,
      name: str(x.name, "姓名"),
      role: x.role,
      scope,
      active: 1,
    };
    statements.push(
      d
        .prepare(
          "INSERT INTO users(id,username,name,role,scope,hash,salt,active) VALUES(?,?,?,?,?,?,?,1)",
        )
        .bind(
          id,
          safe.username,
          safe.name,
          safe.role,
          scope,
          await password(x.password, salt),
          salt,
        ),
    );
  } else {
    assert(action === "user.toggle", "未知账号操作");
    const current = await d
      .prepare(
        "SELECT id,username,name,role,scope,active FROM users WHERE id=?",
      )
      .bind(str(x.id))
      .first<any>();
    assert(
      current && current.id !== u.id && current.role !== "admin",
      "不能变更自己或管理员账号",
    );
    safe = { ...current, active: 1 - current.active };
    statements.push(
      d
        .prepare("UPDATE users SET active=? WHERE id=?")
        .bind(safe.active, safe.id),
    );
    if (!safe.active)
      statements.push(
        d.prepare("DELETE FROM sessions WHERE user_id=?").bind(safe.id),
      );
  }
  const audit: Row = {
    id: "AUD-" + crypto.randomUUID(),
    kind: "audit",
    created: at,
    action,
    target: safe.id,
    actor: u.id,
    actorName: u.name,
    details: JSON.stringify(safe),
  };
  await d.batch([
    d
      .prepare(
        "INSERT INTO transaction_guard(id,valid) VALUES(?,CASE WHEN (SELECT version FROM business_revision WHERE id=1)=? THEN 1 ELSE NULL END)",
      )
      .bind(key, snap.version),
    ...statements,
    d
      .prepare("INSERT INTO business_records(id,kind,data) VALUES(?,?,?)")
      .bind(audit.id, audit.kind, JSON.stringify(audit)),
    ...relationalWrites(d, [audit]),
    d.prepare("UPDATE business_revision SET version=version+1 WHERE id=1"),
    d
      .prepare("UPDATE relational_revision SET version=? WHERE id=1")
      .bind(snap.version + 1),
    d
      .prepare(
        "INSERT INTO commands(id,user_id,result,created) VALUES(?,?,?,?)",
      )
      .bind(key, u.id, JSON.stringify(safe), at),
    d
      .prepare("INSERT INTO command_fingerprints(id,fingerprint) VALUES(?,?)")
      .bind(key, fingerprint),
    d.prepare("DELETE FROM transaction_guard WHERE id=?").bind(key),
  ]);
  return safe;
}
