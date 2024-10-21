import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";
// import adapter from "sveltekit-adapter-chrome-extension"; // TODO: make it an extension some day
import adapter from "@sveltejs/adapter-vercel";

/** @type {import("@sveltejs/kit").Config} */
const config = {
  // Consult https://kit.svelte.dev/docs/integrations#preprocessors
  // for more information about preprocessors
  preprocess: vitePreprocess(),

  kit: {
    // See https://kit.svelte.dev/docs/adapters for more information about adapters.
    adapter: adapter(),
    appDir: "app",
  },

  vitePlugin: {
    inspector: true,
  },
};

export default config;
