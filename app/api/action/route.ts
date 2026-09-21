import { user, mutate, secure, response, fail } from "@/lib/server";
import { assert } from "@/lib/domain";
import { changeAccount } from "@/lib/accounts";
export async function POST(req: Request) {
  try {
    secure(req);
    const u = await user(req),
      b: any = await req.json();
    assert(JSON.stringify(b).length < 50000, "提交数据过大");
    assert(
      typeof b.action === "string" && b.data && typeof b.data === "object",
      "业务请求格式无效",
    );
    const key = req.headers.get("Idempotency-Key") || "";
    const result = b.action.startsWith("user.")
      ? await changeAccount(u, b.action, b.data, key)
      : await mutate(u, b.action, b.data, key);
    return response({ result });
  } catch (e) {
    return fail(e);
  }
}
