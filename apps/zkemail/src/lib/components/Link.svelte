<script lang="ts">
  import { ExternalLinkIcon } from "lucide-svelte";
  import type { HTMLAnchorAttributes } from "svelte/elements";

  let {
    children,
    variant,
    hideExternalIcon = false,
    ...props
  }: HTMLAnchorAttributes & {
    href: string | undefined;
    variant?: "secondary" | "contrast";
    hideExternalIcon?: boolean;
  } = $props();
  let isExternal = $derived(props.target === "_blank");
</script>

<a
  {...props}
  href={props.href}
  rel={props.rel ?? (isExternal ? "noopener noreferrer" : "")}
  style="white-space: nowrap; {props.style ?? ''};"
  class="{props.class ?? ''} {variant ?? ''}"
>
  {@render children?.()}{#if isExternal && !hideExternalIcon}&nbsp;<ExternalLinkIcon
      class="inline size-[1em]"
    />{/if}
</a>
