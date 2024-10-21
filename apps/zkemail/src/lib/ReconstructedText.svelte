<script lang="ts">
  let {
    reconstructed,
  }: {
    reconstructed: (string | undefined)[];
  } = $props();
</script>

<div>
  <pre>{#each reconstructed as char}<span
        >{#if char != null}{#if char === " "}&nbsp;{:else}{char}{/if}{:else}█{/if}</span
      >{/each}</pre>
</div>

<style>
  pre {
    background: unset;
    text-wrap: wrap;
    word-wrap: break-word;
  }
</style>
