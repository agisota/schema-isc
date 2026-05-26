const RAW_SHA = "ec6235e3fcb101f8e3ccf8a2f84a9e2f1562277a";
const RAW_BASE = `https://raw.githubusercontent.com/agisota/schema-isc/${RAW_SHA}/`;

const ASSETS = new Map([
  ["", { file: "index.html", type: "text/html; charset=utf-8", ttl: 0 }],
  ["index.html", { file: "index.html", type: "text/html; charset=utf-8", ttl: 0 }],
  [
    "mpm8kney-Proxima-Nova-Extra-Condensed-Regular-copy.otf",
    { file: "mpm8kney-Proxima-Nova-Extra-Condensed-Regular-copy.otf", type: "font/otf", ttl: 31536000 },
  ],
  [
    "mpm8knk1-Proxima-Vara-copy.ttf",
    { file: "mpm8knk1-Proxima-Vara-copy.ttf", type: "font/ttf", ttl: 31536000 },
  ],
]);

function redirect(base, pathname) {
  const rest = pathname.replace(/^\/(?:source|main)/, "");
  return `${base}${rest || ""}`;
}

async function serveAsset(request, ctx, asset) {
  const cache = caches.default;
  const cacheKey = new Request(request.url, request);
  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  const upstream = await fetch(`${RAW_BASE}${asset.file}`, {
    cf: {
      cacheEverything: true,
      cacheTtl: asset.ttl || 60,
    },
  });

  if (!upstream.ok) {
    return new Response("Artifact not found", {
      status: 502,
      headers: { "cache-control": "no-store" },
    });
  }

  const headers = new Headers(upstream.headers);
  headers.set("access-control-allow-origin", "*");
  headers.set("content-type", asset.type);
  headers.set(
    "cache-control",
    asset.ttl
      ? `public, max-age=${asset.ttl}, immutable`
      : "public, max-age=0, must-revalidate",
  );
  headers.set("x-go-buildworth-artifact-sha", RAW_SHA);

  const response = new Response(upstream.body, {
    status: 200,
    headers,
  });
  ctx.waitUntil(cache.put(cacheKey, response.clone()));
  return response;
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = decodeURIComponent(url.pathname.replace(/^\/+/, ""));

    if (url.pathname === "/source" || url.pathname.startsWith("/source/")) {
      return Response.redirect(redirect("https://source-schema.vercel.app", url.pathname), 302);
    }

    if (url.pathname === "/main" || url.pathname.startsWith("/main/")) {
      return Response.redirect(redirect("https://main-cockpit.vercel.app", url.pathname), 302);
    }

    const asset = ASSETS.get(path);
    if (asset) return serveAsset(request, ctx, asset);

    return new Response("Not found", {
      status: 404,
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "cache-control": "no-store",
      },
    });
  },
};
