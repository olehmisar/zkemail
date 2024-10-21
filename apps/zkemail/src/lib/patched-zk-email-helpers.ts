import sanitizers from "@zk-email/helpers/dist/dkim/sanitizers";
import { DkimVerifier } from "@zk-email/helpers/dist/lib/mailauth/dkim-verifier";
import { writeToStream } from "@zk-email/helpers/dist/lib/mailauth/tools";
import forgePkg from "node-forge";
const { pki } = forgePkg;

// modified https://github.com/zkemail/zk-email-verify/blob/d718290d661e0ec9519a67a1dfa6bf764a9cf322/packages/helpers/package.json

export interface DKIMVerificationResult {
  publicKey: bigint;
  signature: bigint;
  headers: Buffer;
  body: Buffer;
  bodyHash: string;
  signingDomain: string;
  selector: string;
  algo: string;
  format: string;
  modulusLength: number;
  appliedSanitization?: string;
}

/**
 *
 * @param email Entire email data as a string or buffer
 * @param domain Domain to verify DKIM signature for. If not provided, the domain is extracted from the `From` header
 * @param enableSanitization If true, email will be applied with various sanitization to try and pass DKIM verification
 * @returns
 */
export async function verifyDKIMSignature(
  email: Buffer | string,
  domain: string = "",
  enableSanitization: boolean = true,
): Promise<DKIMVerificationResult> {
  const emailStr = email.toString();

  let dkimResult = await tryVerifyDKIM(email, domain);

  // If DKIM verification fails, try again after sanitizing email
  let appliedSanitization;
  if (dkimResult.status.comment === "bad signature" && enableSanitization) {
    const results = await Promise.all(
      sanitizers.map((sanitize) =>
        tryVerifyDKIM(sanitize(emailStr), domain).then((result) => ({
          result,
          sanitizer: sanitize.name,
        })),
      ),
    );

    const passed = results.find((r) => r.result.status.result === "pass");

    if (passed) {
      console.log(
        `DKIM: Verification passed after applying sanitization "${passed.sanitizer}"`,
      );
      dkimResult = passed.result;
      appliedSanitization = passed.sanitizer;
    }
  }

  const {
    status: { result, comment },
    signingDomain,
    publicKey,
    signature,
    status,
    body,
    bodyHash,
  } = dkimResult;

  if (result !== "pass") {
    throw new Error(
      `DKIM signature verification failed for domain ${signingDomain}. Reason: ${comment}`,
    );
  }

  const pubKeyData = pki.publicKeyFromPem(publicKey.toString());

  return {
    signature: BigInt(`0x${Buffer.from(signature, "base64").toString("hex")}`),
    headers: status.signedHeaders,
    body,
    bodyHash,
    signingDomain: dkimResult.signingDomain,
    publicKey: BigInt(pubKeyData.n.toString()),
    selector: dkimResult.selector,
    algo: dkimResult.algo,
    format: dkimResult.format,
    modulusLength: dkimResult.modulusLength,
    appliedSanitization,
  };
}

async function tryVerifyDKIM(email: Buffer | string, domain: string = "") {
  const dkimVerifier = new DkimVerifier({});
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await writeToStream(dkimVerifier, email as any);

  let domainToVerifyDKIM = domain;
  if (!domainToVerifyDKIM) {
    if (dkimVerifier.headerFrom.length > 1) {
      throw new Error(
        "Multiple From header in email and domain for verification not specified",
      );
    }

    domainToVerifyDKIM = dkimVerifier.headerFrom[0]!.split("@")[1]!;
  }

  const dkimResult = dkimVerifier.results.find((d) =>
    domainToVerifyDKIM.endsWith(d.signingDomain),
  );

  if (!dkimResult) {
    throw new Error(
      `DKIM signature not found for domain ${domainToVerifyDKIM}`,
    );
  }

  dkimResult.headers = dkimVerifier.headers;

  return dkimResult;
}

/**
 * DNS over HTTPS (DoH) resolver
 *
 * @export
 * @class DoH
 */
export class DoH {
  // DNS response codes
  static DoHStatusNoError = 0;

  // DNS RR types
  static DoHTypeTXT = 16;

  /**
   * Resolve DKIM public key from DNS
   *
   * @static
   * @param {string} name DKIM record name (e.g. 20230601._domainkey.gmail.com)
   * @param {string} dnsServerURL DNS over HTTPS API URL
   * @return {*}  {(Promise<string | null>)} DKIM public key or null if not found
   * @memberof DoH
   */
  public static async resolveDKIMPublicKey(
    name: string,
    dnsServerURL: string,
  ): Promise<string | null> {
    let cleanURL = dnsServerURL;
    if (!cleanURL.startsWith("https://")) {
      cleanURL = `https://${cleanURL}`;
    }
    if (cleanURL.endsWith("/")) {
      cleanURL = cleanURL.slice(0, -1);
    }

    const queryUrl = new URL(cleanURL);
    queryUrl.searchParams.set("name", name);
    queryUrl.searchParams.set("type", DoH.DoHTypeTXT.toString());

    const resp = await fetch(queryUrl, {
      headers: {
        accept: "application/dns-json",
      },
    });

    if (resp.status === 200) {
      const out = await resp.json();
      if (
        typeof out === "object" &&
        out !== null &&
        "Status" in out &&
        "Answer" in out
      ) {
        const result = out as DoHResponse;
        if (
          result.Status === DoH.DoHStatusNoError &&
          result.Answer.length > 0
        ) {
          for (const ans of result.Answer) {
            if (ans.type === DoH.DoHTypeTXT) {
              let DKIMRecord = ans.data;
              /*
                  Remove all double quotes
                  Some DNS providers wrap TXT records in double quotes,
                  and others like Cloudflare may include them. According to
                  TXT (potentially multi-line) and DKIM (Base64 data) standards,
                  we can directly remove all double quotes from the DKIM public key.
              */
              DKIMRecord = DKIMRecord.replace(/"/g, "");
              return DKIMRecord;
            }
          }
        }
      }
    }
    return null;
  }
}

// DoH servers list
export enum DoHServer {
  // Google Public DNS
  Google = "https://dns.google/resolve",
  // Cloudflare DNS
  Cloudflare = "https://cloudflare-dns.com/dns-query",
}

interface DoHResponse {
  Status: number; // NOERROR - Standard DNS response code (32 bit integer).
  TC: boolean; // Whether the response is truncated
  AD: boolean; // Whether all response data was validated with DNSSEC
  CD: boolean; // Whether the client asked to disable DNSSEC
  Question: Question[];
  Answer: Answer[];
  Comment: string;
}

interface Question {
  name: string; // FQDN with trailing dot
  type: number; // A - Standard DNS RR type. 5:CNAME, 16:TXT
}

interface Answer {
  name: string; // Always matches name in the Question section
  type: number; // A - Standard DNS RR type. 5:CNAME, 16:TXT
  TTL: number; // Record's time-to-live in seconds
  data: string; // Record data
}
