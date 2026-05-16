import { defineConfig } from "vite";

const htmlEntry = (file: string) => new URL(file, import.meta.url).pathname;

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
