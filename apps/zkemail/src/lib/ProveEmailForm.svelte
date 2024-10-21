<script lang="ts">
  import { lib } from "$lib";
  import HeadersSelector from "./HeadersSelector.svelte";
  import ReconstructedEmail, {
    type VerificationResult,
  } from "./ReconstructedEmail.svelte";
  import TextSelector from "./TextSelector.svelte";
  import type { ParsedEmail } from "./email-utils";
  import { Ui } from "./ui";

  let {
    email,
  }: {
    email: ParsedEmail;
  } = $props();

  let textSelectors: {
    headers?: HeadersSelector;
    body?: TextSelector;
  } = $state({});
  let reveals = $derived({
    headersReveals: textSelectors.headers?.reveals ?? [],
    bodyReveals: textSelectors.body?.reveals ?? [],
  });
  let reconstructed: VerificationResult = $derived.by(() => {
    const reconstructed = lib.zkemail.reconstructFromParts({
      headersLen: email.headers.length ?? 0,
      bodyLen: email.body.length ?? 0,
      ...lib.zkemail.toHeadersAndBodyReveals(reveals),
    });
    return {
      verified: true,
      data: {
        dkimSignature: { ...email.dkimSignature, signatureBase64: "" },
        reconstructed,
      },
    };
  });

  let proof: string | undefined = $state();
  async function prove() {
    try {
      proof = undefined;
      proof = JSON.stringify(await lib.zkemail.prove(email, reveals));
    } catch (e) {
      Ui.toast.error(`Failed to prove: ${e}`);
      throw e;
    }
  }
</script>

<Ui.GapContainer>
  <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
    <div>
      <Ui.Card>
        <Ui.Card.Header>
          <Ui.Card.Title
            >Select what you want to reveal to a verifier</Ui.Card.Title
          >
        </Ui.Card.Header>
        <Ui.Card.Content>
          <div class="prose">
            <h4>Metadata</h4>
          </div>
          <HeadersSelector
            bind:this={textSelectors.headers}
            headers={email.headers}
          />
          <hr class="my-4" />
          <div class="mb-3">
            <div class="prose">
              <h4 class="mb-0">Message</h4>
              <small style="font-style: italic;" class="mt-0">
                Select text you want to reveal. Click on selection to cancel it.
              </small>
            </div>
          </div>
          <TextSelector bind:this={textSelectors.body} text={email.body} />
        </Ui.Card.Content>
      </Ui.Card>
    </div>
    <div>
      <Ui.Card>
        <Ui.Card.Header>
          <Ui.Card.Title>A verifier will see this</Ui.Card.Title>
        </Ui.Card.Header>
        <Ui.Card.Content>
          <ReconstructedEmail result={reconstructed} />
        </Ui.Card.Content>
      </Ui.Card>
    </div>
  </div>

  <div>
    <Ui.LoadingButton variant="default" onclick={prove} style="width: 100%;">
      Prove
    </Ui.LoadingButton>
  </div>

  <div class="prose">
    <h3>Proof</h3>
  </div>
  {#if proof}
    <Ui.CopyButton text={proof}>Copy proof</Ui.CopyButton>
    <Ui.Textarea readonly value={proof} />
  {:else}
    <p class="italic">Proof will be shown here.</p>
  {/if}
</Ui.GapContainer>
