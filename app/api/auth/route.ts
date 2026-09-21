import { bootstrap, db, password, digest, user, secure, response, fail } from '@/lib/server';
import { assert, str } from '@/lib/domain';
import { readJson } from '@/lib/request';

export async function GET(req: Request) {
  try { return response({ user: await user(req) }); } catch (e) { return fail(e); }
}
export async function POST(req: Request) {
  try {
    secure(req);
    const b = await readJson(req, 4096);
    const name = str(b.username, '账号').toLowerCase();
    assert(/^[a-z][a-z0-9_]{1,30}$/.test(name), '账号格式无效');
    assert(typeof b.password === 'string' && b.password.length > 0 && b.password.length <= 128, '密码须为 1–128 位');
    await bootstrap();
    const key = await digest(name + '|' + (req.headers.get('cf-connecting-ip') || 'local'));
    const d = db(), now = Date.now();
    // Atomically consume an attempt, including concurrent login requests.
    const attempt = await d.prepare(
      'INSERT INTO login_attempts(key,count,until) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN until<=? THEN 1 ELSE count+1 END,until=CASE WHEN until<=? THEN ? ELSE until END RETURNING count,until',
    ).bind(key, now + 900000, now, now, now + 900000).first<{count: number; until: number}>();
    if (!attempt || attempt.count > 12)
      return response({ error: '尝试次数过多，请 15 分钟后重试' }, 429, { 'Retry-After': String(Math.max(1, Math.ceil(((attempt?.until || now + 900000) - now) / 1000))) });
    const u = await d.prepare('SELECT * FROM users WHERE username=? AND active=1').bind(name).first<any>();
    const hash = await password(b.password, u?.salt || 'invalid-user-salt');
    assert(u && hash === u.hash, '账号或密码错误');
    const token = crypto.randomUUID() + crypto.randomUUID();
    const old = (req.headers.get('cookie') || '').match(/(?:^|;\s*)sc_session=([^;]+)/)?.[1];
    await d.batch([
      d.prepare('DELETE FROM login_attempts WHERE key=? OR until<=?').bind(key, now),
      d.prepare('DELETE FROM sessions WHERE expires<=? OR token=?').bind(now, old ? await digest(old) : ''),
      d.prepare('INSERT INTO sessions(token,user_id,expires) VALUES(?,?,?)').bind(await digest(token), u.id, now + 12 * 3600000),
    ]);
    return response({ ok: true }, 200, { 'Set-Cookie': `sc_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=43200${new URL(req.url).protocol === 'https:' ? '; Secure' : ''}` });
  } catch (e) { return fail(e); }
}
export async function DELETE(req: Request) {
  try {
    secure(req);
    const token = (req.headers.get('cookie') || '').match(/(?:^|;\s*)sc_session=([^;]+)/)?.[1];
    if (token) await db().prepare('DELETE FROM sessions WHERE token=?').bind(await digest(token)).run();
    return response({ ok: true }, 200, { 'Set-Cookie': `sc_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${new URL(req.url).protocol === 'https:' ? '; Secure' : ''}` });
  } catch (e) { return fail(e); }
}
