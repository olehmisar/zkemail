<script lang="ts">
  import { lib } from "$lib";
  import ReconstructedEmail from "$lib/ReconstructedEmail.svelte";
  import { Ui } from "$lib/ui";
  import { z } from "zod";

  let result:
    | {
        data: Awaited<ReturnType<typeof lib.zkemail.verify>>;
        verified: true;
      }
    | {
        verified: false;
      }
    | undefined = $state(undefined);
  const schema = z.object({
    proof: z.string().min(1),
  });
  async function onsubmit(input: z.infer<typeof schema>) {
    result = undefined;
    try {
      const proof = JSON.parse(input.proof);
      const data = await lib.zkemail.verify(proof);
      result = {
        verified: true,
        data,
      };
    } catch (e) {
      Ui.toast.error(`Invalid proof: ${e}`);
      result = {
        verified: false,
      };
    }
  }
</script>

<Ui.GapContainer class="container">
  <div style="text-align: center;" class="prose max-w-full">
    <h1>Verify email</h1>
  </div>

  <Ui.Form {schema} {onsubmit}>
    {#snippet children(form, formData)}
      <Ui.Form.Field {form} name="proof">
        <Ui.Form.Control let:attrs>
          <Ui.Form.Label>Paste proof here</Ui.Form.Label>
          <Ui.Textarea {...attrs} bind:value={formData.proof as string} />
        </Ui.Form.Control>
        <Ui.Form.Description></Ui.Form.Description>
        <Ui.Form.FieldErrors />
      </Ui.Form.Field>

      <Ui.Form.SubmitButton variant="default">Verify</Ui.Form.SubmitButton>
    {/snippet}
  </Ui.Form>

  {#if result}
    <h2>Verified email parts</h2>
    <ReconstructedEmail {result} />
  {/if}

  <section class="prose">
    <h3>How it works</h3>
    <ol style="padding-left: 1em;">
      <li>Paste the proof in the input above and click "Verify".</li>
      <li>The proof is verified in browser.</li>
      <li>
        Verified email domain and revealed email parts will be shown after
        verification.
      </li>
      <li>If the proof is invalid, you will see an error message.</li>
    </ol>
  </section>
</Ui.GapContainer>
