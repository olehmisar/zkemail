<script lang="ts">
  import { isEqual, orderBy, uniqWith } from "lodash-es";

  let {
    text,
  }: {
    text: string;
  } = $props();

  type Chunk = {
    fromIndex: number;
    toIndex: number;
  };
  let chunks: Chunk[] = $state([]);
  export const reveals = $derived(
    chunks.map((c) => ({
      fromIndex: c.fromIndex,
      part: text.substring(c.fromIndex, c.toIndex),
    })),
  );

  function handleSelection() {
    const selection = document.getSelection()!;
    if (!selection) {
      return;
    }
    const [start, end] = orderBy([
      selection.anchorOffset,
      selection.focusOffset,
    ]) as [number, number];
    if (start >= end) {
      return;
    }
    const chunk: Chunk = {
      fromIndex: start,
      toIndex: end,
    };

    chunks.push(chunk);
    chunks = uniqWith(chunks, (a, b) =>
      isEqual($state.snapshot(a), $state.snapshot(b)),
    ); // TODO: better chunk deduplication/merging logic
    console.log("chunks", $state.snapshot(chunks));
  }

  function isRevealed(i: number) {
    const chunk = chunks.find((c) => c.fromIndex <= i && c.toIndex > i);
    return {
      chunk,
      revealed: chunk != null,
    };
  }
</script>

<div style="position: relative;">
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <pre onmouseup={handleSelection} class="actual-text">{text}</pre>
  <pre
    class="selection-overlay"
    style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none;">{#each text as char, i}{@const {
        chunk,
        revealed,
      } =
        isRevealed(
          i,
        )}<!-- svelte-ignore a11y_click_events_have_key_events --><!-- svelte-ignore a11y_no_static_element_interactions --><span
        class={revealed ? "bg-primary/30" : ""}
        style="pointer-events: {revealed ? 'initial' : 'none'};"
        onclick={() => {
          if (!revealed) {
            return;
          }
          chunks = chunks.filter((c) => c !== chunk);
        }}>{char}</span
      >{/each}</pre>
</div>

<style lang="scss">
  .actual-text,
  .selection-overlay {
    margin: 0;
    padding: 0.2rem;
    background: unset;
    text-wrap: wrap;
  }
</style>
