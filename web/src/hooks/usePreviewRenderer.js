import { useCallback, useRef, useState } from "react";
import { renderMarkdownToCards } from "@/lib/renderer";

export default function usePreviewRenderer() {
    const [previewState, setPreviewState] = useState({
        loading: false,
        error: "",
        width: 1080,
        height: 1350,
    });
    const [previewFrames, setPreviewFrames] = useState([]);
    const renderRequestRef = useRef(0);
    const activeUrlsRef = useRef([]);

    const clearUrls = useCallback((urls) => {
        const target = urls || activeUrlsRef.current;
        target.forEach((url) => URL.revokeObjectURL(url));
        if (!urls) activeUrlsRef.current = [];
    }, []);

    const renderPreview = useCallback(
        ({ markdown, expandRefs, preset, firstSlidePreset, ratio, bgImage, presetsMap }) => {
            const currentMarkdown = markdown.trim();
            if (!currentMarkdown) {
                clearUrls();
                setPreviewFrames([]);
                setPreviewState({ loading: false, error: "", width: 1080, height: 1350 });
                return;
            }

            const requestId = renderRequestRef.current + 1;
            renderRequestRef.current = requestId;
            setPreviewState((prev) => ({ ...prev, loading: true, error: "" }));

            try {
                const data = renderMarkdownToCards(expandRefs(markdown), {
                    preset,
                    firstSlidePreset: firstSlidePreset || undefined,
                    ratio,
                    backgroundImage: bgImage.trim() || undefined,
                    presets: presetsMap,
                });

                if (renderRequestRef.current !== requestId) return;

                const cards = Array.isArray(data.cards) ? data.cards : [];
                if (!cards.length) {
                    clearUrls();
                    setPreviewFrames([]);
                    setPreviewState({ loading: false, error: "", width: data.width || 1080, height: data.height || 1350 });
                    return;
                }

                const frames = cards.map((html, index) => {
                    const blob = new Blob([html], { type: "text/html" });
                    const url = URL.createObjectURL(blob);
                    return { key: `${requestId}-${index}`, index: index + 1, total: cards.length, url };
                });

                clearUrls();
                activeUrlsRef.current = frames.map((f) => f.url);
                setPreviewFrames(frames);
                setPreviewState({ loading: false, error: "", width: data.width || 1080, height: data.height || 1350 });
            } catch (err) {
                if (renderRequestRef.current !== requestId) return;
                clearUrls();
                setPreviewFrames([]);
                setPreviewState({ loading: false, error: err.message, width: 1080, height: 1350 });
            }
        },
        [clearUrls]
    );

    return { previewState, previewFrames, renderPreview, clearUrls };
}
