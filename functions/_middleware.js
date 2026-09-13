/**
 * Cloudflare Pages Middleware
 *
 * Safety net for hostname-based canonical and robots directives.
 * When request host is `tryhorizon.pages.dev`, injects/rewrites:
 *   1. <link rel="canonical" href="https://unfollowaman.tech/<path>" />
 *   2. <meta name="robots" content="noindex, nofollow" />
 *
 * Requests targeting `unfollowaman.tech` or other domains pass through unmodified.
 */

export async function onRequest(context) {
  const { request, next } = context;
  const url = new URL(request.url);
  const host = (request.headers.get("host") || url.host).toLowerCase();

  // Only apply modifications when request is served on tryhorizon.pages.dev
  if (host.includes("tryhorizon.pages.dev")) {
    const response = await next();
    const contentType = response.headers.get("content-type") || "";

    if (contentType.includes("text/html")) {
      const canonicalUrl = `https://unfollowaman.tech${url.pathname}${url.search}`;

      return new HTMLRewriter()
        .on('link[rel="canonical"]', {
          element(element) {
            element.remove();
          }
        })
        .on('meta[name="robots"]', {
          element(element) {
            element.remove();
          }
        })
        .on("head", {
          element(element) {
            element.append(
              `<link rel="canonical" href="${canonicalUrl}" />\n<meta name="robots" content="noindex, nofollow" />`,
              { html: true }
            );
          }
        })
        .transform(response);
    }

    return response;
  }

  return next();
}
