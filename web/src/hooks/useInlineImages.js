import { useCallback, useRef } from "react";
import { MD_DATA_IMAGE_RE, MD_INLINE_REF_RE } from "../constants";

export default function useInlineImages() {
    const seqRef = useRef(0);
    const mapRef = useRef(new Map());

    const makeRef = useCallback((dataUrl) => {
        seqRef.current += 1;
        const ref = `cid:img-${seqRef.current}`;
        mapRef.current.set(ref, dataUrl);
        return ref;
    }, []);

    const expandRefs = useCallback((md) => {
        return String(md || "").replace(MD_INLINE_REF_RE, (match, alt, ref) => {
            const dataUrl = mapRef.current.get(ref);
            if (!dataUrl) return match;
            return `![${alt || "image"}](${dataUrl})`;
        });
    }, []);

    const compactRefs = useCallback(
        (md) =>
            String(md || "").replace(MD_DATA_IMAGE_RE, (_match, alt, dataUrl) => {
                const ref = makeRef(dataUrl);
                return `![${alt || "image"}](${ref})`;
            }),
        [makeRef]
    );

    return { makeRef, expandRefs, compactRefs };
}
