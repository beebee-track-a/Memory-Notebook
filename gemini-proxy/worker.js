/**
 * Cloudflare Worker: Gemini Live API WebSocket Proxy
 *
 * This worker proxies WebSocket connections from Chinese users to Google's Gemini API
 * via Cloudflare's global edge network.
 *
 * Architecture: Browser -> Cloudflare Workers -> Google Gemini API
 */

const GEMINI_WS_BASE = 'wss://generativelanguage.googleapis.com';
const GEMINI_HTTP_BASE = 'https://generativelanguage.googleapis.com';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // CORS preflight handling
    if (request.method === 'OPTIONS') {
      return handleCORS(request, env);
    }

    // WebSocket upgrade request
    if (request.headers.get('Upgrade') === 'websocket') {
      return handleWebSocket(request, env, url);
    }

    // HTTP API proxy (for REST API calls like summary generation)
    if (url.pathname.startsWith('/v1')) {
      return handleHttpProxy(request, env, url);
    }

    // Health check
    if (url.pathname === '/health') {
      return new Response(JSON.stringify({ status: 'ok', timestamp: Date.now() }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response('Gemini Live API Proxy - Powered by Cloudflare Workers', {
      status: 200,
      headers: { 'Content-Type': 'text/plain' }
    });
  }
};

/**
 * Handle CORS preflight requests
 */
function handleCORS(request, env) {
  const origin = request.headers.get('Origin') || '*';
  const allowedOrigins = (env.ALLOWED_ORIGINS || '').split(',').filter(Boolean);

  // Validate origin if ALLOWED_ORIGINS is configured
  const corsOrigin = allowedOrigins.length === 0 || allowedOrigins.includes(origin)
    ? origin
    : allowedOrigins[0];

  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': corsOrigin,
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Api-Key, Upgrade, Connection, Sec-WebSocket-Key, Sec-WebSocket-Version, Sec-WebSocket-Extensions',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Max-Age': '86400',
    }
  });
}

/**
 * Handle WebSocket proxy connections
 */
async function handleWebSocket(request, env, url) {
  // Extract API key from multiple sources (in order of priority)
  const apiKey = url.searchParams.get('key')
              || url.searchParams.get('access_token')
              || request.headers.get('X-Api-Key')
              || env.GEMINI_API_KEY;

  if (!apiKey) {
    return new Response('API key required. Pass via ?key= parameter, X-Api-Key header, or configure GEMINI_API_KEY secret.', {
      status: 401
    });
  }

  // Validate origin if configured
  const origin = request.headers.get('Origin');
  const allowedOrigins = (env.ALLOWED_ORIGINS || '').split(',').filter(Boolean);
  if (allowedOrigins.length > 0 && origin && !allowedOrigins.includes(origin)) {
    return new Response('Origin not allowed', { status: 403 });
  }

  // Construct target WebSocket URL
  // The SDK uses path format: /ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent
  const wsPath = url.pathname.startsWith('/ws')
    ? url.pathname
    : '/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent';

  const targetUrl = `${GEMINI_WS_BASE}${wsPath}?key=${apiKey}`;

  console.log(`[WebSocket] Proxying to: ${wsPath}`);

  // Create WebSocket pair for client <-> worker communication
  const [client, server] = Object.values(new WebSocketPair());

  // Accept the incoming WebSocket connection
  server.accept();

  // Connect to upstream Gemini WebSocket
  const geminiWs = new WebSocket(targetUrl);

  // Track connection state and buffer messages before upstream is ready
  let isGeminiOpen = false;
  const pendingMessages = [];

  // Upstream connection opened
  geminiWs.addEventListener('open', () => {
    console.log('[WebSocket] Connected to Gemini');
    isGeminiOpen = true;

    // Flush any pending messages
    while (pendingMessages.length > 0) {
      const msg = pendingMessages.shift();
      try {
        geminiWs.send(msg);
      } catch (err) {
        console.error('[WebSocket] Error sending pending message:', err);
      }
    }
  });

  // Forward messages from Gemini to client
  geminiWs.addEventListener('message', (event) => {
    try {
      server.send(event.data);
    } catch (err) {
      console.error('[WebSocket] Error forwarding to client:', err);
    }
  });

  // Handle upstream close
  geminiWs.addEventListener('close', (event) => {
    console.log(`[WebSocket] Gemini closed: ${event.code} ${event.reason}`);
    try {
      server.close(event.code, event.reason || 'Upstream closed');
    } catch (err) {
      // Connection already closed
    }
  });

  // Handle upstream error
  geminiWs.addEventListener('error', (event) => {
    console.error('[WebSocket] Gemini error:', event);
    try {
      server.close(1011, 'Upstream connection error');
    } catch (err) {
      // Connection already closed
    }
  });

  // Forward messages from client to Gemini
  server.addEventListener('message', (event) => {
    if (isGeminiOpen) {
      try {
        geminiWs.send(event.data);
      } catch (err) {
        console.error('[WebSocket] Error forwarding to Gemini:', err);
      }
    } else {
      // Buffer messages until upstream is ready
      pendingMessages.push(event.data);
    }
  });

  // Handle client close
  server.addEventListener('close', (event) => {
    console.log(`[WebSocket] Client closed: ${event.code} ${event.reason}`);
    try {
      geminiWs.close(event.code, event.reason || 'Client closed');
    } catch (err) {
      // Connection already closed
    }
  });

  // Handle client error
  server.addEventListener('error', (event) => {
    console.error('[WebSocket] Client error:', event);
    try {
      geminiWs.close(1011, 'Client connection error');
    } catch (err) {
      // Connection already closed
    }
  });

  // Return WebSocket upgrade response
  return new Response(null, {
    status: 101,
    webSocket: client,
    headers: {
      'Access-Control-Allow-Origin': origin || '*',
    }
  });
}

/**
 * Handle HTTP API proxy requests
 */
async function handleHttpProxy(request, env, url) {
  const origin = request.headers.get('Origin') || '*';

  // Construct target URL
  const targetUrl = `${GEMINI_HTTP_BASE}${url.pathname}${url.search}`;

  console.log(`[HTTP] Proxying to: ${url.pathname}`);

  // Clone headers and remove hop-by-hop headers
  const headers = new Headers(request.headers);
  headers.delete('Host');
  headers.delete('CF-Connecting-IP');
  headers.delete('CF-IPCountry');
  headers.delete('CF-RAY');
  headers.delete('CF-Visitor');

  try {
    const response = await fetch(targetUrl, {
      method: request.method,
      headers,
      body: request.body,
    });

    // Add CORS headers to response
    const newHeaders = new Headers(response.headers);
    newHeaders.set('Access-Control-Allow-Origin', origin);
    newHeaders.set('Access-Control-Allow-Credentials', 'true');

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders,
    });
  } catch (err) {
    console.error('[HTTP] Proxy error:', err);
    return new Response(JSON.stringify({ error: 'Proxy request failed', message: err.message }), {
      status: 502,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': origin,
      }
    });
  }
}
