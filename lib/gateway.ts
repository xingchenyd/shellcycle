/** Authenticated origin boundary; do not trust browser-supplied forwarding headers. */
export async function gatewayRequest(request: Request, env: { GATEWAY_SECRET?: string; PUBLIC_ORIGIN?: string }): Promise<Request | Response> {
  const url = new URL(request.url);
  if (!env.GATEWAY_SECRET && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) return request;
  const hash = async (value: string) => new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
  const [a, b] = await Promise.all([hash(request.headers.get("x-shellcycle-gateway") || ""), hash(env.GATEWAY_SECRET || "")]);
  let difference = 0;
  for (let i = 0; i < a.length; i++) difference |= a[i] ^ b[i];
  if (!env.GATEWAY_SECRET || difference !== 0 || !env.PUBLIC_ORIGIN) return new Response("This address is no longer available.", { status: 410, headers: { "Cache-Control": "no-store", "Content-Type": "text/plain; charset=utf-8", "X-Robots-Tag": "noindex, nofollow" } });
  const canonical = new URL(env.PUBLIC_ORIGIN);
  url.protocol = canonical.protocol;
  url.host = canonical.host;
  const forwarded = new Request(url, request);
  forwarded.headers.delete("x-shellcycle-gateway");
  forwarded.headers.set("host", canonical.host);
  // Preserve Origin so existing API CSRF checks still reject foreign origins.
  return forwarded;
}
