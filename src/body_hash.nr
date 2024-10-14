global BODY_HASH_PREFIX = "bh=".as_bytes();
global BODY_HASH_END_MARKER = ";".as_bytes()[0];
global BODY_HASH_BASE64_LEN = 44;

pub fn body_hash_from_header<let HeadersLen: u32>(headers: [u8; HeadersLen]) -> [u8; 32] {
    let body_hash_position = locate_body_hash(headers);

    // verify that it is the body hash parameter indeed
    let body_hash_prefix_position = body_hash_position - BODY_HASH_PREFIX.len();
    for i in 0..BODY_HASH_PREFIX.len() {
        assert(headers[body_hash_prefix_position + i] == BODY_HASH_PREFIX[i], "body hash prefix mismatch");
    }

    assert(headers[body_hash_position + BODY_HASH_BASE64_LEN] == BODY_HASH_END_MARKER, "body hash end marker mismatch");

    let mut body_hash_base64 =  [0 as u8; BODY_HASH_BASE64_LEN];
    for i in 0..BODY_HASH_BASE64_LEN {
        body_hash_base64[i] = headers[body_hash_position + i];
    }

    // noir team switched it up. encode = decode
    noir_base64::base64_encode(body_hash_base64)
}

unconstrained fn locate_body_hash<let N: u32>(headers: [u8; N]) -> u32 {
    // we don't care about the sizes here because it's unconstrained
    let needle: string_search::SubString32 = string_search::SubString::new(BODY_HASH_PREFIX, BODY_HASH_PREFIX.len());
    let haystack: string_search::StringBody16384 = string_search::StringBody::new(headers, headers.len());
    let (result, match_position) = haystack.substring_match(needle);
    assert(result, "body hash not found");
    match_position + BODY_HASH_PREFIX.len()
}
