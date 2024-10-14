struct RevealStringPart<let N: u32> {
    from_index: u32,
    part: [u8; N],
}

impl<let N: u32> RevealStringPart<N> {
    fn assert_matches<let H: u32>(self, haystack: [u8; H]) {
        for i in 0..N {
            assert(haystack[self.from_index + i] == self.part[i], "invalid string reveal");
        }
    }
}
