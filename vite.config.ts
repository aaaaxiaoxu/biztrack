import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";

const htmlEntry = (file: string) => fileURLToPath(new URL(file, import.meta.url));

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        about: htmlEntry("./about.html"),
        finances: htmlEntry("./finances.html"),
        help: htmlEntry("./help.html"),
        index: htmlEntry("./index.html"),
        orders: htmlEntry("./orders.html"),
        privacy: htmlEntry("./privacy.html"),
        products: htmlEntry("./products.html"),
      },
    },
  },
});
