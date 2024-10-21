<script lang="ts">
  import { Ui } from "$lib/ui";
</script>

<Ui.Container
  as="footer"
  class="border-t-[1px]"
  style="
    padding: 1rem 0.5rem;
    text-align: center;
    margin-top: auto;
  "
>
  &copy; {new Date().getFullYear()}
  <Ui.Link href="mailto:hello@shieldswap.org">ShieldSwap Labs LLC</Ui.Link> &middot;
  <Ui.Link href="https://shieldswap.org" target="_blank">ShieldSwap</Ui.Link>
</Ui.Container>
