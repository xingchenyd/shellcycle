/** Read a bounded body before parsing: Content-Length is optional and untrusted. */
export async function readBody(req: Request, maxBytes: number): Promise<Uint8Array<ArrayBuffer>> {
  const declared = Number(req.headers.get("content-length") || 0);
  if (!Number.isFinite(declared) || declared < 0 || declared > maxBytes)
    throw new Error("提交数据过大或长度无效");
  const reader = req.body?.getReader();
  if (!reader) return new Uint8Array();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel();
        throw new Error("提交数据过大");
      }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const part of chunks) { bytes.set(part, offset); offset += part.length; }
  return bytes;
}

export async function readJson(req: Request, maxBytes = 50000): Promise<Record<string, any>> {
  const bytes = await readBody(req, maxBytes);
  let parsed: unknown;
  try { parsed = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)); }
  catch { throw new Error("请求 JSON 格式无效"); }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
    throw new Error("请求须为 JSON 对象");
  return parsed as Record<string, any>;
}
