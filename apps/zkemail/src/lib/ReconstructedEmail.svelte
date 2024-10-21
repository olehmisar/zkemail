<script lang="ts" context="module">
  export type VerificationResult =
    | {
        data: Awaited<ReturnType<typeof lib.zkemail.verify>>;
        verified: true;
      }
    | {
        verified: false;
      };
</script>

<script lang="ts">
  import type { lib } from "$lib";
  import ReconstructedText from "./ReconstructedText.svelte";
  import { Ui } from "./ui";

  let { result }: { result: VerificationResult } = $props();
</script>

<p></p>
{#if result.verified}
  <Ui.Card>
    <Ui.Card.Header>
      <div>
        Proof:
        {#if result.verified}
          <span style="color: green">Verified</span>
          <br />
          <span>
            Signed by "@{result.data.dkimSignature.domain}" with selector "{result
              .data.dkimSignature.selector}"
          </span>
        {:else}
          <span style="color: red">Not verified</span>
        {/if}
      </div>
    </Ui.Card.Header>

    <Ui.Card.Content>
      <div class="prose">
        <h4>Metadata</h4>
      </div>
      <ReconstructedText reconstructed={result.data.reconstructed.headers} />

      <hr class="my-4" />

      <div class="prose">
        <h4>Message</h4>
      </div>
      <ReconstructedText reconstructed={result.data.reconstructed.body} />
    </Ui.Card.Content>
  </Ui.Card>
{/if}
