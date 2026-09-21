import handler from "vinext/server/fetch-handler";
import { gatewayRequest } from "./lib/gateway";
export default {
  async fetch(request: Request, env: Cloudflare.Env, ctx: ExecutionContext) {
    const accepted = await gatewayRequest(request, env);
    if (accepted instanceof Response) return accepted;
    return handler.fetch(accepted, env, ctx);
  },
};
