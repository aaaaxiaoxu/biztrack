import { defineConfig } from "vite";

const localePrefixes = new Set(["zh-cn", "zh-hk"]);
const pageFiles = new Set([
  "",
  "index.html",
  "products.html",
  "orders.html",
  "finances.html",
  "help.html",
  "about.html",
  "privacy.html",
]);

function stripLocalePrefix(pathname) {
  const segments = pathname.split("/").filter(Boolean);
  if (!localePrefixes.has(segments[0])) return null;
  segments.shift();
  const page = segments.join("/") || "index.html";
  return pageFiles.has(page) ? `/${page}` : null;
}

export default defineConfig({
  plugins: [
    {
      name: "biztrack-locale-prefix-dev-rewrite",
      configureServer(server) {
        server.middlewares.use((request, _response, next) => {
          const [pathname, suffix = ""] = request.url.split(/(?=[?#])/);
          const rewrittenPath = stripLocalePrefix(pathname);
          if (rewrittenPath) {
            request.url = `${rewrittenPath}${suffix}`;
          }
          next();
        });
      },
    },
  ],
});
