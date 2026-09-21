import { mkdir, writeFile } from "node:fs/promises";
const origin = new URL(process.env.UPSTREAM_ORIGIN || "https://invalid.example");
const secret = process.env.GATEWAY_SECRET;
if (origin.hostname === "invalid.example" || origin.protocol !== "https:" || origin.pathname !== "/" || origin.search || origin.hash || origin.username || !secret || secret.length < 32) throw Error("Set HTTPS UPSTREAM_ORIGIN and a strong GATEWAY_SECRET.");
// Generated deployment configuration contains a secret; never commit .vercel/.
await mkdir(".vercel/output/static", { recursive: true });
await writeFile(".vercel/output/config.json", JSON.stringify({ version: 3, routes: [{ src: "/(.*)", dest: origin.origin + "/$1", headers: { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex, nofollow" }, transforms: [{ type: "request.headers", op: "set", target: { key: "x-shellcycle-gateway" }, args: secret }] }] }));
console.log("Gateway routing built; private configuration is not printed.");
