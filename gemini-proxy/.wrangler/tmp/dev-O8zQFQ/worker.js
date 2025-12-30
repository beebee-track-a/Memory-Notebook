var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// .wrangler/tmp/bundle-drJWwH/checked-fetch.js
var urls = /* @__PURE__ */ new Set();
function checkURL(request, init) {
  const url = request instanceof URL ? request : new URL(
    (typeof request === "string" ? new Request(request, init) : request).url
  );
  if (url.port && url.port !== "443" && url.protocol === "https:") {
    if (!urls.has(url.toString())) {
      urls.add(url.toString());
      console.warn(
        `WARNING: known issue with \`fetch()\` requests to custom HTTPS ports in published Workers:
 - ${url.toString()} - the custom port will be ignored when the Worker is published using the \`wrangler deploy\` command.
`
      );
    }
  }
}
__name(checkURL, "checkURL");
globalThis.fetch = new Proxy(globalThis.fetch, {
  apply(target, thisArg, argArray) {
    const [request, init] = argArray;
    checkURL(request, init);
    return Reflect.apply(target, thisArg, argArray);
  }
});

// worker.js
var GEMINI_WS_BASE = "wss://generativelanguage.googleapis.com";
var GEMINI_HTTP_BASE = "https://generativelanguage.googleapis.com";
var worker_default = {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") {
      return handleCORS(request, env);
    }
    if (request.headers.get("Upgrade") === "websocket") {
      return handleWebSocket(request, env, url);
    }
    if (url.pathname.startsWith("/v1")) {
      return handleHttpProxy(request, env, url);
    }
    if (url.pathname === "/health") {
      return new Response(JSON.stringify({ status: "ok", timestamp: Date.now() }), {
        headers: { "Content-Type": "application/json" }
      });
    }
    return new Response("Gemini Live API Proxy - Powered by Cloudflare Workers", {
      status: 200,
      headers: { "Content-Type": "text/plain" }
    });
  }
};
function handleCORS(request, env) {
  const origin = request.headers.get("Origin") || "*";
  const allowedOrigins = (env.ALLOWED_ORIGINS || "").split(",").filter(Boolean);
  const corsOrigin = allowedOrigins.length === 0 || allowedOrigins.includes(origin) ? origin : allowedOrigins[0];
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": corsOrigin,
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Api-Key, Upgrade, Connection, Sec-WebSocket-Key, Sec-WebSocket-Version, Sec-WebSocket-Extensions",
      "Access-Control-Allow-Credentials": "true",
      "Access-Control-Max-Age": "86400"
    }
  });
}
__name(handleCORS, "handleCORS");
async function handleWebSocket(request, env, url) {
  const apiKey = url.searchParams.get("key") || url.searchParams.get("access_token") || request.headers.get("X-Api-Key") || env.GEMINI_API_KEY;
  if (!apiKey) {
    return new Response("API key required. Pass via ?key= parameter, X-Api-Key header, or configure GEMINI_API_KEY secret.", {
      status: 401
    });
  }
  const origin = request.headers.get("Origin");
  const allowedOrigins = (env.ALLOWED_ORIGINS || "").split(",").filter(Boolean);
  if (allowedOrigins.length > 0 && origin && !allowedOrigins.includes(origin)) {
    return new Response("Origin not allowed", { status: 403 });
  }
  const wsPath = url.pathname.startsWith("/ws") ? url.pathname : "/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent";
  const targetUrl = `${GEMINI_WS_BASE}${wsPath}?key=${apiKey}`;
  console.log(`[WebSocket] Proxying to: ${wsPath}`);
  const [client, server] = Object.values(new WebSocketPair());
  server.accept();
  const geminiWs = new WebSocket(targetUrl);
  let isGeminiOpen = false;
  const pendingMessages = [];
  geminiWs.addEventListener("open", () => {
    console.log("[WebSocket] Connected to Gemini");
    isGeminiOpen = true;
    while (pendingMessages.length > 0) {
      const msg = pendingMessages.shift();
      try {
        geminiWs.send(msg);
      } catch (err) {
        console.error("[WebSocket] Error sending pending message:", err);
      }
    }
  });
  geminiWs.addEventListener("message", (event) => {
    try {
      server.send(event.data);
    } catch (err) {
      console.error("[WebSocket] Error forwarding to client:", err);
    }
  });
  geminiWs.addEventListener("close", (event) => {
    console.log(`[WebSocket] Gemini closed: ${event.code} ${event.reason}`);
    try {
      server.close(event.code, event.reason || "Upstream closed");
    } catch (err) {
    }
  });
  geminiWs.addEventListener("error", (event) => {
    console.error("[WebSocket] Gemini error:", event);
    try {
      server.close(1011, "Upstream connection error");
    } catch (err) {
    }
  });
  server.addEventListener("message", (event) => {
    if (isGeminiOpen) {
      try {
        geminiWs.send(event.data);
      } catch (err) {
        console.error("[WebSocket] Error forwarding to Gemini:", err);
      }
    } else {
      pendingMessages.push(event.data);
    }
  });
  server.addEventListener("close", (event) => {
    console.log(`[WebSocket] Client closed: ${event.code} ${event.reason}`);
    try {
      geminiWs.close(event.code, event.reason || "Client closed");
    } catch (err) {
    }
  });
  server.addEventListener("error", (event) => {
    console.error("[WebSocket] Client error:", event);
    try {
      geminiWs.close(1011, "Client connection error");
    } catch (err) {
    }
  });
  return new Response(null, {
    status: 101,
    webSocket: client,
    headers: {
      "Access-Control-Allow-Origin": origin || "*"
    }
  });
}
__name(handleWebSocket, "handleWebSocket");
async function handleHttpProxy(request, env, url) {
  const origin = request.headers.get("Origin") || "*";
  const targetUrl = `${GEMINI_HTTP_BASE}${url.pathname}${url.search}`;
  console.log(`[HTTP] Proxying to: ${url.pathname}`);
  const headers = new Headers(request.headers);
  headers.delete("Host");
  headers.delete("CF-Connecting-IP");
  headers.delete("CF-IPCountry");
  headers.delete("CF-RAY");
  headers.delete("CF-Visitor");
  try {
    const response = await fetch(targetUrl, {
      method: request.method,
      headers,
      body: request.body
    });
    const newHeaders = new Headers(response.headers);
    newHeaders.set("Access-Control-Allow-Origin", origin);
    newHeaders.set("Access-Control-Allow-Credentials", "true");
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders
    });
  } catch (err) {
    console.error("[HTTP] Proxy error:", err);
    return new Response(JSON.stringify({ error: "Proxy request failed", message: err.message }), {
      status: 502,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": origin
      }
    });
  }
}
__name(handleHttpProxy, "handleHttpProxy");

// ../../../../../opt/homebrew/lib/node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// ../../../../../opt/homebrew/lib/node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-drJWwH/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = worker_default;

// ../../../../../opt/homebrew/lib/node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-drJWwH/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=worker.js.map
