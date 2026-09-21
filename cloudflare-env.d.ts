declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    GATEWAY_SECRET?: string;
    PUBLIC_ORIGIN?: string;
  }
}
