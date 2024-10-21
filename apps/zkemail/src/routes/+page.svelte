<script lang="ts">
  import { lib } from "$lib";
  import { demoEmail } from "$lib/demoEmail";
  import { splitEmail } from "$lib/email-utils";
  import ProveEmailForm from "$lib/ProveEmailForm.svelte";
  import { Ui } from "$lib/ui";
  import { createQuery } from "@tanstack/svelte-query";

  let emailQueryKey = $state(0);
  let rawEmail:
    | { showDemo: false; selected?: FileList | undefined }
    | { showDemo: true; selected?: undefined } = $state({
    showDemo: false,
  });

  let emailQuery = $derived(
    createQuery(
      {
        queryKey: ["email", rawEmail, emailQueryKey],
        async queryFn() {
          const emailStr = rawEmail.showDemo
            ? demoEmail
            : await rawEmail?.selected?.item(0)?.text();
          if (!emailStr) {
            return null;
          }

          const parsedEmail = await splitEmail(emailStr);
          if (
            parsedEmail.headers.length === 0 &&
            parsedEmail.body.length === 0
          ) {
            throw new Error("Invalid email headers and body");
          }
          return parsedEmail;
        },
        retry: false,
        refetchOnWindowFocus: false,
        refetchOnMount: false,
        refetchOnReconnect: false,
      },
      lib.queries.queryClient,
    ),
  );
</script>

<Ui.GapContainer class="container">
  <div class="prose max-w-full mb-3" style="text-align: center;">
    <h1 class="m-0">Prove email</h1>
    <h4 class="m-0">
      using
      <Ui.Link href="http://noir-lang.org/" target="_blank">Noir</Ui.Link>
    </h4>
  </div>

  {#if !$emailQuery.data}
    <Ui.Card
      style="text-align: center; display: flex; flex-direction: column; gap: 0.5rem; "
    >
      <Ui.Card.Content class="p-3">
        <div>
          <label class="mb-0 inline-block">
            <span role="button" class="inline-block">Select .eml file</span>
            <br />
            <input
              type="file"
              bind:files={rawEmail.selected}
              oninput={() => {
                emailQueryKey++;
              }}
              accept=".eml"
              style="width: auto; margin: 0; {$emailQuery.data
                ? ''
                : 'display: none;'}"
              class="no-input-button"
            />
          </label>
        </div>

        <div>OR</div>

        <div>
          <Ui.Button
            onclick={() => {
              rawEmail = { showDemo: true };
            }}
          >
            Try demo email
          </Ui.Button>
        </div>
      </Ui.Card.Content>
    </Ui.Card>
  {/if}

  <Ui.Query query={$emailQuery}>
    {#snippet success(texts)}
      {#if texts}
        <div style="text-align: right">
          <Ui.Button
            onclick={() => {
              rawEmail = { showDemo: false };
            }}
          >
            Change email
          </Ui.Button>
        </div>
        <ProveEmailForm email={texts} />
      {/if}
    {/snippet}
  </Ui.Query>

  <section class="prose">
    <h3>How it works</h3>

    <ol style="padding-left: 1em;">
      <li>Download .eml file from your email client and upload it here</li>
      <li>All text in the email is hidden by default</li>
      <li>Select text in the email you want to reveal</li>
      <li>You can select multiple parts of the email</li>
      <li>Click on the selection to cancel it</li>
      <li>Once you selected all parts that you want to prove, click "Prove"</li>
      <li>
        Wait 1-2 minutes for the proof and send it to a verifier. Verifier will
        be able to check your proof and see only the parts of the email you
        revealed.
      </li>
    </ol>
  </section>
</Ui.GapContainer>

<style lang="scss">
  :global(.no-input-button::-webkit-file-upload-button) {
    display: none;
  }
</style>
