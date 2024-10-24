mod reveal_string;
use reveal_string::RevealStringPart;
mod body_hash;

use noir_rsa::bignum::BigNum;
use noir_rsa::bignum::runtime_bignum::BigNumInstance;
use noir_rsa::bignum::fields::Params2048;
use noir_rsa::RSA;

global PUBKEY_LIMBS_LEN: u32 = 18;
global SIGNATURE_LIMBS_LEN: u32 = 18;

type BN2048 = BigNum<18, Params2048>;
type RSA2048 = RSA<BN2048, BigNumInstance<18, Params2048>, 256>;

global rsa: RSA2048 = RSA {};

pub fn assert_verify_email_signature<let HeadersLen: u32, let BodyLen: u32>(
    headers: [u8; HeadersLen],
    body: [u8; BodyLen],
    pubkey_limbs: [Field; PUBKEY_LIMBS_LEN],
    pubkey_redc_limbs: [Field; PUBKEY_LIMBS_LEN],
    signature_limbs: [Field; SIGNATURE_LIMBS_LEN]
) {
    let signature: BN2048 = BigNum::from_array(signature_limbs);
    let pubkey: BigNumInstance<18, Params2048> = BigNumInstance::new(pubkey_limbs, pubkey_redc_limbs);

    {
        // verify that body hash from header matches body
        let body_hash = std::hash::sha256(body);
        assert(body_hash == crate::body_hash::body_hash_from_header(headers), "body hash does not match");
    }

    {
        // verify header signature
        let headers_hash = std::hash::sha256(headers);
        assert(rsa.verify_sha256_pkcs1v15(pubkey, headers_hash, signature), "invalid email signature");
    }
}

#[test]
fn test_email() {
    let pubkey_limbs = [
        0xe5cf995b5ef59ce9943d1f4209b6ab, 0xe0caf03235e91a2db27e9ed214bcc6, 0xafe1309f87414bd36ed296dacfade2, 0xbeff3f19046a43adce46c932514988, 0x324041af8736e87de4358860fff057, 0xadcc6669dfa346f322717851a8c22a, 0x8b2a193089e6bf951c553b5a6f71aa, 0x0a570fe582918c4f731a0002068df2, 0x39419a433d6bfdd1978356cbca4b60, 0x550d695a514d38b45c862320a00ea5, 0x1c56ac1dfbf1beea31e8a613c2a51f, 0x6a30c9f22d2e5cb6934263d0838809, 0x0a281f268a44b21a4f77a91a52f960, 0x5134dc3966c8e91402669a47cc8597, 0x71590781df114ec072e641cdc5d224, 0xa1bc0f0937489c806c1944fd029dc9, 0x911f6e47f84db3b64c3648ebb5a127, 0xd5
    ];
    let pubkey_redc_limbs = [
        0xa48a824e4ebc7e0f1059f3ecfa57c4, 0x05c1db23f3c7d47ad7e7d7cfda5189, 0x79bb6bbbd8facf011f022fa9051aec, 0x24faa4cef474bed639362ea71f7a21, 0x1503aa50b77e24b030841a7d061581, 0x5bbf4e62805e1860a904c0f66a5fad, 0x5cbd24b72442d2ce647dd7d0a44368, 0x074a8839a4460c169dce7138efdaef, 0x0f06e09e3191b995b08e5b45182f65, 0x51fad4a89f8369fe10e5d4b6e149a1, 0xdc778b15982d11ebf7fe23b4e15f10, 0xa09ff3a4567077510c474e4ac0a21a, 0xb37e69e5dbb77167b73065e4c5ad6a, 0xecf4774e22e7fe3a38642186f7ae74, 0x16e72b5eb4c813a3b37998083aab81, 0xa48e7050aa8abedce5a45c16985376, 0xdd3285e53b322b221f7bcf4f8f8ad8, 0x0132
    ];
    let signature_limbs = [
        0x5779c85587e51cb8de5c29d7fdfeb0, 0xcd7ea8b6119f76f117ecb5042f8fc0, 0xeb7ac32b81d5a87bc2046fa0004e27, 0x62708c43b0c07a8fe8bdc97c479138, 0xc1e90d184f22a80be4a484a6ebd462, 0x39f3ff00e47728aaf74802d2d1d07b, 0x0f39de2cf99bf20dab7b8ae9240acd, 0xf4875cb76ce2538f255d70476136d6, 0xde151a5005ca614d6af7dd01e2a083, 0x6fe12b286f3195cae005fd7d2a1766, 0xd6e43a3060eccc555f2ee1e2929932, 0x0d5fa7cc79c794ae80310b491a1b40, 0x9cff415204cbc05c772ede05903440, 0xe7190ccff38575ae70dd055cd892d2, 0xf34bb777c0c842b0e88738eafdf634, 0x21040437e1e945a201ff58e542be68, 0x12f254fa4a0fb776ffe8759eb9eefa, 0x12
    ];
    let headers = "from:runnier.leagues.0j@icloud.com\r\ncontent-type:text/plain; charset=us-ascii\r\nmime-version:1.0 (Mac OS X Mail 16.0 \\(3731.500.231\\))\r\nsubject:Hello\r\nmessage-id:<8F819D32-B6AC-489D-977F-438BBC4CAB27@me.com>\r\ndate:Sat, 26 Aug 2023 12:25:22 +0400\r\nto:zkewtest@gmail.com\r\ndkim-signature:v=1; a=rsa-sha256; c=relaxed/relaxed; d=icloud.com; s=1a1hai; t=1693038337; bh=7xQMDuoVVU4m0W0WRVSrVXMeGSIASsnucK9dJsrc+vU=; h=from:Content-Type:Mime-Version:Subject:Message-Id:Date:to; b=".as_bytes();
    let body = "Hello,\r\n\r\nHow are you?\r\n".as_bytes();
    assert_verify_email_signature(
        headers,
        body,
        pubkey_limbs,
        pubkey_redc_limbs,
        signature_limbs
    )
}
