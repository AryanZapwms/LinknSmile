// Calls Next.js route handlers directly with a real Request, the way the
// runtime does. Each call gets its own client IP unless one is given, so
// per-IP rate limits never leak between tests.

let ipSeq = 0;

export interface CallOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  bearer?: string;
  ip?: string;
  query?: Record<string, string | number | boolean>;
  params?: Record<string, string>;
}

export interface CallResult<T = any> {
  status: number;
  body: T;
  headers: Headers;
}

type Handler = (req: any, ctx?: any) => Promise<Response> | Response;

export async function call<T = any>(handler: Handler, path: string, opts: CallOptions = {}): Promise<CallResult<T>> {
  const url = new URL(`http://localhost${path}`);
  for (const [k, v] of Object.entries(opts.query ?? {})) url.searchParams.set(k, String(v));
  const headers: Record<string, string> = {
    "x-forwarded-for": opts.ip ?? `10.${Math.floor(++ipSeq / 65536) % 256}.${Math.floor(ipSeq / 256) % 256}.${ipSeq % 256}`,
    ...opts.headers,
  };
  if (opts.bearer) headers.authorization = `Bearer ${opts.bearer}`;
  let body: string | undefined;
  if (opts.body !== undefined) {
    body = typeof opts.body === "string" ? opts.body : JSON.stringify(opts.body);
    headers["content-type"] ??= "application/json";
  }
  const { NextRequest } = await import("next/server");
  const req = new NextRequest(url, { method: opts.method ?? (body ? "POST" : "GET"), headers, body });
  const res = await handler(req, { params: Promise.resolve(opts.params ?? {}) });
  const text = await res.text();
  let parsed: any = text;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {}
  return { status: res.status, body: parsed, headers: res.headers };
}
