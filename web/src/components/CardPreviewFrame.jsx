import { useRef, useEffect, memo } from "react";

/**
 * Renders HTML into an iframe without flickering by writing directly
 * to the iframe's contentDocument instead of changing src/srcdoc.
 */
const CardPreviewFrame = memo(function CardPreviewFrame({ html, width, height, scale, title }) {
    const iframeRef = useRef(null);
    const initializedRef = useRef(false);

    useEffect(() => {
        const iframe = iframeRef.current;
        if (!iframe) return;

        const write = () => {
            try {
                const doc = iframe.contentDocument;
                if (!doc) return;
                doc.open();
                doc.write(html);
                doc.close();
            } catch {
                // cross-origin fallback — shouldn't happen with same-origin writes
            }
        };

        if (initializedRef.current) {
            // iframe already loaded — write directly
            write();
        } else {
            // first mount — wait for iframe to be ready, then write
            iframe.addEventListener("load", () => {
                initializedRef.current = true;
                write();
            }, { once: true });
            // Trigger initial load with blank page
            iframe.srcdoc = "<!DOCTYPE html><html><body></body></html>";
        }
    }, [html]);

    return (
        <iframe
            ref={iframeRef}
            title={title}
            width={width}
            height={height}
            style={{
                border: "none",
                display: "block",
                transform: `scale(${scale})`,
                transformOrigin: "top left",
            }}
        />
    );
});

export default CardPreviewFrame;
