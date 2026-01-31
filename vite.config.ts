// import { defineConfig } from "vite";
// import react from "@vitejs/plugin-react";

// // https://vite.dev/config/
// export default defineConfig(({ mode }) => ({
//   base: mode === "production" ? "/OrcaCast_App/" : "/",
//   plugins: [react()],
// }));

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig(() => ({
  base: "/",
  plugins: [react()],
}));
