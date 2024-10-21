<script lang="ts">
  import { orderBy, partition } from "lodash-es";
  import { assert, type ElementOf } from "ts-essentials";
  import { Label } from "./components/ui/label";
  import type { RevealStringPartRequest } from "./noir";

  let {
    headers,
  }: {
    headers: string;
  } = $props();

  let splitHeaders = $derived.by(() => {
    // from https://github.com/jhermsmeier/node-dkim/blob/65bbe349da190da68c2b8276acd7ff18750b68a4/lib/verify.js#L29C16-L29C40
    // eslint-disable-next-line no-control-regex
    const HEADERS_SPLIT_REGEX = /\r\n(?=[^\x20\x09]|$)/g;
    const separator = "\r\n";
    const split = headers.split(HEADERS_SPLIT_REGEX).map((h) => h + separator);
    // TODO(perf): merge adjacent reveals
    const headersReveals: RevealStringPartRequest[] = [];
    let lastIndex = 0;
    for (const header of split) {
      if (lastIndex === 0) {
        headersReveals.push({ fromIndex: 0, part: header });
      } else {
        headersReveals.push({
          fromIndex: lastIndex - separator.length,
          part: separator + header,
        });
      }
      lastIndex += header.length;
    }
    const formatted = split.map((header, i) => {
      const splitIndex = header.indexOf(":");
      assert(splitIndex !== -1, `invalid header line format: ${header}`);
      const [key, value] = [
        header.slice(0, splitIndex),
        header.slice(splitIndex + 1),
      ];
      assert(key && value, `invalid header line: ${header}`);
      return {
        key,
        value,
        reveal: headersReveals[i]!,
      };
    });

    const mainHeaderNames = ["from", "to", "subject", "date"];
    const [mainHeaders, otherHeaders] = partition(formatted, (h) =>
      mainHeaderNames.includes(h.key.toLowerCase()),
    );
    return {
      mainHeaders: orderBy(mainHeaders, (h) =>
        mainHeaderNames.indexOf(h.key.toLowerCase()),
      ),
      otherHeaders,
    };
  });

  let checked: Record<string, boolean> = $state({});

  export const reveals = $derived(
    [...splitHeaders.mainHeaders, ...splitHeaders.otherHeaders]
      .filter((h) => checked[h.key])
      .map((h) => h.reveal),
  );
</script>

{#each splitHeaders.mainHeaders as header}
  {@render renderRow(header)}
{/each}

<details>
  <summary>Other metadata</summary>
  {#each splitHeaders.otherHeaders as header}
    {@render renderRow(header)}
  {/each}
</details>

{#snippet renderRow(header: ElementOf<typeof splitHeaders.mainHeaders>)}
  <div>
    <Label>
      <input type="checkbox" bind:checked={checked[header.key]} />
      {header.key}: {header.value}
    </Label>
  </div>
{/snippet}
