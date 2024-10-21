<script lang="ts">
  import "../app.css";

  import { dev } from "$app/environment";
  import { lib } from "$lib";
  import { Ui } from "$lib/ui";
  import { QueryClientProvider } from "@tanstack/svelte-query";
  import { inject } from "@vercel/analytics";
  import Footer from "./Footer.svelte";
  import Header from "./Header.svelte";

  let { children } = $props();

  inject({ mode: dev ? "development" : "production" });
</script>

<QueryClientProvider client={lib.queries.queryClient}>
  <div class="flex flex-col h-full">
    <div class="flex-grow">
      <Header />

      {@render children()}
    </div>
    <div class="flex-shrink-0">
      <Footer />
    </div>
  </div>

  <Ui.Toaster position="bottom-right" />
</QueryClientProvider>
