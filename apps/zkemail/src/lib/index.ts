import { browser } from "$app/environment";
import { QueryClient } from "@tanstack/svelte-query";
import { NoirCompilerService, ZkEmailCircuitService } from "./noir.js";
import { QueriesService } from "./services/QueriesService.svelte.js";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      enabled: browser,
    },
  },
});

const queries = new QueriesService(queryClient);
const compiler = new NoirCompilerService();
const zkemail = new ZkEmailCircuitService(compiler);

export const lib = {
  queries,
  zkemail,
};
