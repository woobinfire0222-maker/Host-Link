import { type Request, type Response, type NextFunction } from "express";
import { eq } from "drizzle-orm";
import { db, sitesTable } from "@workspace/db";

/**
 * Subdomain-based site serving middleware.
 *
 * When BASE_DOMAIN is set (e.g. "dropsite.com"), any request whose Host header
 * matches "<sitename>.dropsite.com" is served directly as that site's HTML —
 * no path rewriting needed.
 *
 * How to enable:
 *   1. Buy your domain (e.g. dropsite.com)
 *   2. Add a wildcard DNS A record:  *.dropsite.com  →  <server IP>
 *   3. Set the environment variable:  BASE_DOMAIN=dropsite.com
 *   4. Requests to <name>.dropsite.com will automatically serve the right site.
 *
 * While BASE_DOMAIN is not set, this middleware is a no-op and /s/:name
 * path-based routing continues to work as usual.
 */
export function subdomainMiddleware(req: Request, res: Response, next: NextFunction): void {
  const baseDomain = process.env.BASE_DOMAIN;
  if (!baseDomain) {
    next();
    return;
  }

  const host = req.hostname;

  // Strip port if present
  const hostWithoutPort = host.split(":")[0];

  // Check if this is a subdomain of our base domain
  const suffix = `.${baseDomain}`;
  if (!hostWithoutPort.endsWith(suffix)) {
    next();
    return;
  }

  const siteName = hostWithoutPort.slice(0, hostWithoutPort.length - suffix.length);

  // Ignore empty or www
  if (!siteName || siteName === "www") {
    next();
    return;
  }

  // Serve the site
  (async () => {
    const [site] = await db
      .select()
      .from(sitesTable)
      .where(eq(sitesTable.name, siteName))
      .limit(1);

    if (!site) {
      res.status(404).send(`<!DOCTYPE html><html><head><title>404</title>
        <style>body{font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#0f0f0f;color:#fff;}
        .box{text-align:center;}.title{font-size:4rem;font-weight:700;}</style></head>
        <body><div class="box"><div class="title">404</div>
        <p style="color:#888">"<strong>${siteName}</strong>" 사이트가 존재하지 않습니다.</p>
        <a href="https://${baseDomain}" style="color:#667eea">홈으로 돌아가기</a></div></body></html>`);
      return;
    }

    const hideBadge = `<style>#replit-badge-container,#replit-badge,.replit-badge,[data-replit-badge]{display:none!important;visibility:hidden!important;}</style>`;
    const html = site.htmlContent?.includes("</body>")
      ? site.htmlContent.replace("</body>", `${hideBadge}</body>`)
      : (site.htmlContent ?? "") + hideBadge;

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(html);
  })().catch(() => next());
}
