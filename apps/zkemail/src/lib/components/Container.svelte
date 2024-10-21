<script lang="ts">
  import type { HTMLAttributes } from "svelte/elements";

  interface $$Props extends HTMLAttributes<HTMLDivElement> {
    as?: string;
    fluid?: boolean;
  }
  $: ({ as: as_ = "div", fluid, ...props } = $$props as $$Props);
</script>

<svelte:element
  this={as_}
  {...props}
  class="{fluid ? 'container-fluid' : 'container'} {props.class ?? ''}"
>
  <slot />
</svelte:element>
