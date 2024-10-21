import { dev } from "$app/environment";
import {
  UltraHonkBackend,
  type CompiledCircuit,
} from "@noir-lang/backend_barretenberg";
import { Noir } from "@noir-lang/noir_js";
import { compile, createFileManager } from "@noir-lang/noir_wasm";
import { keyBy, mapValues, times, uniqBy } from "lodash-es";
import { assert } from "ts-essentials";
import { stringToBytes } from "viem";
import {
  extractSignInfoFromEmail,
  getLimbs,
  resolveDkimPublicKey,
  type ParsedEmail,
} from "./email-utils";

export class ZkEmailCircuitService {
  constructor(private compiler: NoirCompilerService) {}

  async getZkemailCircuit(
    headersLen: number,
    bodyLen: number,
    headersReveals: RevealStringPart[],
    bodyReveals: RevealStringPart[],
  ) {
    const src = `
      fn main(
          headers: [u8; ${headersLen}],
          body: [u8; ${bodyLen}],
          ${joinTrailing(
            [...headersReveals, ...bodyReveals].map((r) =>
              r.toNoirArgumentDef(),
            ),
            ",\n",
          )}
          pubkey_limbs: pub [Field; zkemail::PUBKEY_LIMBS_LEN],
          pubkey_redc_limbs: pub [Field; zkemail::PUBKEY_LIMBS_LEN],
          signature_limbs: pub [Field; zkemail::SIGNATURE_LIMBS_LEN]
      ) {
          zkemail::assert_verify_email_signature(headers, body, pubkey_limbs, pubkey_redc_limbs, signature_limbs);
          ${joinTrailing(
            headersReveals.map((r) => r.toNoirAssertionStatement("headers")),
            ";\n",
          )}
          ${joinTrailing(
            bodyReveals.map((r) => r.toNoirAssertionStatement("body")),
            ";\n",
          )}
      }
    `;

    if (dev) {
      console.log("compiling", src);
    }

    const circuit = await this.compiler.compile(src);
    const noir = new Noir(circuit);
    const backend = new UltraHonkBackend(circuit);
    return { backend, noir };
  }

  async prove(
    email: ParsedEmail,
    params: {
      headersReveals: RevealStringPartRequest[];
      bodyReveals: RevealStringPartRequest[];
    },
  ) {
    const { headersReveals, bodyReveals } =
      this.toHeadersAndBodyReveals(params);
    const reveals = [...headersReveals, ...bodyReveals];
    assert(
      uniqBy(reveals, (r) => r.noirVariableName).length === reveals.length,
      "duplicate reveals noir variable names",
    );

    const info = await extractSignInfoFromEmail(email);
    const input = await getInput(info, reveals);

    console.time("compile circuit");
    const { backend, noir } = await this.getZkemailCircuit(
      input.headers.length,
      input.body.length,
      headersReveals,
      bodyReveals,
    );
    console.timeEnd("compile circuit");

    console.time("get witness");
    const { witness } = await noir.execute(input);
    console.timeEnd("get witness");

    console.time("generate proof");
    const proof = await backend.generateProof(witness);
    console.timeEnd("generate proof");

    console.log("proof", proof.proof);

    const result: EmailProof = {
      proof: {
        publicInputs: proof.publicInputs,
        proof: Array.from(proof.proof),
      },
      dkimSignature: info.dkimSignature,
      headersLen: input.headers.length,
      bodyLen: input.body.length,
      headersReveals: params.headersReveals,
      bodyReveals: params.bodyReveals,
    };
    return result;
  }

  async verify(proof: EmailProof) {
    // TODO(security): get headersReveals and bodyReveals from proof
    await this.#assertRevealsAgainstPublicInputs(proof);

    const { headersReveals, bodyReveals } = this.toHeadersAndBodyReveals({
      headersReveals: proof.headersReveals,
      bodyReveals: proof.bodyReveals,
    });
    const { backend } = await this.getZkemailCircuit(
      proof.headersLen,
      proof.bodyLen,
      headersReveals,
      bodyReveals,
    );
    const verified = await backend.verifyProof({
      publicInputs: proof.proof.publicInputs,
      proof: Uint8Array.from(proof.proof.proof),
    });
    assert(verified === true, "proof is not valid");
    return {
      dkimSignature: proof.dkimSignature,
      reconstructed: this.reconstructFromParts({
        headersLen: proof.headersLen,
        bodyLen: proof.bodyLen,
        headersReveals,
        bodyReveals,
      }),
    };
  }

  toHeadersAndBodyReveals(params: {
    headersReveals: RevealStringPartRequest[];
    bodyReveals: RevealStringPartRequest[];
  }) {
    const headersReveals = params.headersReveals.map(
      (r, i) => new RevealStringPart(r.fromIndex, r.part, `reveal_headers${i}`),
    );
    const bodyReveals = params.bodyReveals.map(
      (r, i) => new RevealStringPart(r.fromIndex, r.part, `reveal_body${i}`),
    );
    return { headersReveals, bodyReveals };
  }

  /**
   * Should be used as a preview for a prover. Verifier must verify the proof before reconstruction
   */
  reconstructFromParts(params: {
    headersLen: number;
    bodyLen: number;
    headersReveals: RevealStringPart[];
    bodyReveals: RevealStringPart[];
  }) {
    return {
      headers: this.#reconstructFromPartsSingle(
        params.headersLen,
        params.headersReveals,
      ),
      body: this.#reconstructFromPartsSingle(
        params.bodyLen,
        params.bodyReveals,
      ),
    };
  }

  #reconstructFromPartsSingle(len: number, parts: RevealStringPart[]) {
    const result: (string | undefined)[] = times(len, () => undefined);
    for (const part of parts) {
      for (const [i, char] of part.part.split("").entries()) {
        const curr = result[part.fromIndex + i];
        assert(
          curr == null || curr === char,
          `char mismatch at index "${part.fromIndex + i}": "${curr}" !== "${char}"`,
        );
        result[part.fromIndex + i] = char;
      }
    }
    return result;
  }

  async #assertRevealsAgainstPublicInputs(proof: EmailProof) {
    const pi = proof.proof.publicInputs;
    let i = 0;
    for (const request of proof.headersReveals) {
      assert(
        BigInt(pi[i++]!) === BigInt(request.fromIndex),
        "pi: header reveals from_index mismatch",
      );
      for (const char of request.part) {
        assert(
          BigInt(pi[i++]!) === BigInt(char.charCodeAt(0)),
          "pi: header reveals part mismatch",
        );
      }
    }
    for (const request of proof.bodyReveals) {
      assert(
        BigInt(pi[i++]!) === BigInt(request.fromIndex),
        "pi: body reveals from_index mismatch",
      );
      for (const char of request.part) {
        assert(
          BigInt(pi[i++]!) === BigInt(char.charCodeAt(0)),
          "pi: body reveals part mismatch",
        );
      }
    }

    const publicKey = await resolveDkimPublicKey(proof.dkimSignature);
    const a = await getLimbs(publicKey, proof.dkimSignature.signatureBase64);
    for (const limb of a.public_key_limbs) {
      assert(
        BigInt(pi[i++]!) === BigInt(limb),
        "pi: public_key_limbs mismatch",
      );
    }
    for (const limb of a.public_key_redc_limbs) {
      assert(
        BigInt(pi[i++]!) === BigInt(limb),
        "pi: public_key_redc_limbs mismatch",
      );
    }
    for (const limb of a.signature_limbs) {
      assert(BigInt(pi[i++]!) === BigInt(limb), "pi: signature_limbs mismatch");
    }
    assert(i === pi.length, "proof has more public inputs than expected");
  }
}

export interface EmailProof {
  proof: {
    publicInputs: string[];
    /** Uint8Array */
    proof: number[];
  };
  headersLen: number;
  bodyLen: number;
  dkimSignature: {
    domain: string;
    selector: string;
    // TODO: signature is not needed really. It's here because `get_limbs` cannot except only public key
    signatureBase64: string;
  };
  // TODO(security): define headersReveal and bodyReveas from proof.publicInputs
  headersReveals: RevealStringPartRequest[];
  bodyReveals: RevealStringPartRequest[];
}

export interface RevealStringPartRequest {
  fromIndex: number;
  part: string;
}
/**
 * Note: keep in sync with Noir
 */
export class RevealStringPart {
  // noir struct fields
  readonly fromIndex: number;
  readonly part: string;

  // extra fields
  readonly noirVariableName: string;
  constructor(fromIndex: number, part: string, noirVarName: string) {
    this.fromIndex = fromIndex;
    this.noirVariableName = noirVarName;
    this.part = part;
  }

  toNoirArgumentDef() {
    return `${this.noirVariableName}: pub zkemail::RevealStringPart<${this.part.length}>`;
  }

  toNoirAssertionStatement(matchOn: "headers" | "body") {
    return `${this.noirVariableName}.assert_matches(${matchOn})`;
  }

  toNoirInput() {
    return {
      from_index: this.fromIndex,
      part: asBytes(this.part),
    };
  }
}

async function getInput(
  info: Awaited<ReturnType<typeof extractSignInfoFromEmail>>,
  reveals: RevealStringPart[],
) {
  const revealsMap = mapValues(
    keyBy(reveals, (r) => r.noirVariableName),
    (r) => r.toNoirInput(),
  );
  return {
    headers: asBytes(info.headers),
    body: asBytes(info.body),
    ...revealsMap,
    pubkey_limbs: info.public_key_limbs,
    pubkey_redc_limbs: info.public_key_redc_limbs,
    signature_limbs: info.signature_limbs,
  };
}

function asBytes(s: string) {
  return Array.from(stringToBytes(s));
}

function joinTrailing(array: unknown[], separator: string) {
  const joined = array.join(separator);
  if (array.length > 0) {
    return joined + separator;
  }
  return joined;
}

export class NoirCompilerService {
  private cache = new Map<string, CompiledCircuit>();

  async compile(src: string) {
    const cached = this.cache.get(src);
    if (cached) {
      return cached;
    }
    const res = await this.#compileInternal(src);
    this.cache.set(src, res);
    return res;
  }

  async #compileInternal(src: string) {
    const fm = createFileManager("/");
    await fm.writeFile("./src/main.nr", stringToReadableStream(src));
    const nargoSrc = `
        [package]
        name = "zkemail_circuit"
        type = "bin"

        [dependencies]
        zkemail = { git = "https://github.com/olehmisar/zkemail/", tag = "v0.33.0" }
      `;
    await fm.writeFile("./Nargo.toml", stringToReadableStream(nargoSrc));

    const result = await compile(fm);
    if (!("program" in result)) {
      throw new Error("Compilation failed");
    }
    const res = result.program as CompiledCircuit;
    return res;
  }
}

function stringToReadableStream(str: string) {
  const encoder = new TextEncoder();
  const uint8Array = encoder.encode(str);

  return new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(uint8Array);
      controller.close();
    },
  });
}
