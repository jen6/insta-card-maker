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

    const renderPreview = useCallback(
        ({ markdown, expandRefs, preset, firstSlidePreset, ratio, bgImage, presetsMap }) => {
            const currentMarkdown = markdown.trim();
            if (!currentMarkdown) {
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
                    setPreviewFrames([]);
                    setPreviewState({ loading: false, error: "", width: data.width || 1080, height: data.height || 1350 });
                    return;
                }

                // Use stable keys based on card index so iframes are reused across renders
                const frames = cards.map((html, index) => ({
                    key: `card-${index}`,
                    index: index + 1,
                    total: cards.length,
                    html,
                }));

                setPreviewFrames(frames);
                setPreviewState({ loading: false, error: "", width: data.width || 1080, height: data.height || 1350 });
            } catch (err) {
                if (renderRequestRef.current !== requestId) return;
                setPreviewFrames([]);
                setPreviewState({ loading: false, error: err.message, width: 1080, height: 1350 });
            }
        },
        []
    );

    // clearUrls kept as no-op for backward compat (no more blob URLs to revoke)
    const clearUrls = useCallback(() => { }, []);

    return { previewState, previewFrames, renderPreview, clearUrls };
}
