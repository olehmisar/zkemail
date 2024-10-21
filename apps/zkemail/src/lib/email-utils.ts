import { utils } from "@repo/utils";
import { get_limbs } from "@shieldswap/email_account_utils_rs";
import { assert } from "ts-essentials";
import { toBytes } from "viem";
import {
  DoH,
  DoHServer,
  verifyDKIMSignature,
} from "./patched-zk-email-helpers.js";

const SUPPORTED_DKIM_ALGORITHM = "RSA-SHA256";

export async function extractSignInfoFromEmail(parsedEmail: ParsedEmail) {
  const publicKeyBase64 = await resolveDkimPublicKey(parsedEmail.dkimSignature);

  // {
  //   // TODO
  //   const verified = verifySignature(
  //     publicKeyBase64,
  //     canonicalHeaders,
  //     signatureBase64,
  //   );
  //   assert(verified, "DKIM signature verification failed");
  // }

  const bigNumLimbs = await getLimbs(
    publicKeyBase64,
    parsedEmail.dkimSignature.signatureBase64,
  );
  const result = {
    ...parsedEmail,
    ...bigNumLimbs,
  };
  return result;
}

export type ParsedEmail = Awaited<ReturnType<typeof splitEmail>>;
export async function splitEmail(emailStr: string) {
  const res = await verifyDKIMSignature(emailStr);
  assert(
    res.algo.toLowerCase() === SUPPORTED_DKIM_ALGORITHM.toLowerCase(),
    `Unsupported DKIM algorithm: "${res.algo}"`,
  );
  console.log("headers", res.headers.toString("utf-8"));
  return {
    headers: res.headers.toString("utf-8"),
    body: res.body.toString("utf-8"),
    dkimSignature: {
      domain: res.signingDomain,
      selector: res.selector,
      algorithm: res.algo,
      signatureBase64: Buffer.from(
        toBytes(res.signature, { size: 256 }),
      ).toString("base64"),
    },
  };
}

export async function getLimbs(
  publicKeyBase64: string,
  signatureBase64: string,
) {
  return get_limbs(publicKeyBase64, signatureBase64);
}

export async function resolveDkimPublicKey(params: {
  domain: string;
  selector: string;
}) {
  const result = await DoH.resolveDKIMPublicKey(
    `${params.selector}._domainkey.${params.domain}`,
    DoHServer.Google,
  );
  assert(
    result,
    `DKIM public key not found for {domain: ${params.domain}, selector: ${params.selector}}`,
  );
  const publicKeyBase64 = utils.removePrefixOrThrow(
    result,
    "v=DKIM1; k=rsa; p=",
  );
  assert(
    publicKeyBase64,
    `DKIM public key not found for {domain: ${params.domain}, selector: ${params.selector}}`,
  );
  return publicKeyBase64;
}
