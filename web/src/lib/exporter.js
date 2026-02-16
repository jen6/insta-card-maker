/**
 * Export card HTML strings as a single ZIP containing PNG images.
 * Uses iframe + srcdoc for full CSS isolation, captures with html-to-image.
 */
import { toBlob } from "html-to-image";
import JSZip from "jszip";

function delay(ms) {
    return new Promise((r) => setTimeout(r, ms));
}

async function captureCardHtml(html, width, height) {
    const iframe = document.createElement("iframe");
    iframe.style.cssText = `position:fixed;left:-9999px;top:-9999px;width:${width}px;height:${height}px;border:none;opacity:0;pointer-events:none;`;
    iframe.srcdoc = html;
    document.body.appendChild(iframe);

    try {
        await new Promise((resolve) => {
            iframe.addEventListener("load", resolve, { once: true });
        });
        // Wait for auto-fit script + fonts + layout
        await delay(500);

        const iframeBody = iframe.contentDocument.body;

        const blob = await toBlob(iframeBody, {
            width,
            height,
            pixelRatio: 2,
            cacheBust: true,
        });

        return blob;
    } finally {
        document.body.removeChild(iframe);
    }
}

function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/**
 * Export cards as a single ZIP file containing PNGs.
 */
export async function exportCardsToPng(cardHtmls, width, height, onProgress) {
    const zip = new JSZip();

    for (let i = 0; i < cardHtmls.length; i++) {
        if (onProgress) onProgress({ current: i + 1, total: cardHtmls.length });
        const blob = await captureCardHtml(cardHtmls[i], width, height);
        if (blob) {
            const num = String(i + 1).padStart(2, "0");
            zip.file(`card-${num}.png`, blob);
        }
        if (i < cardHtmls.length - 1) await delay(100);
    }

    const zipBlob = await zip.generateAsync({ type: "blob" });
    downloadBlob(zipBlob, "cards.zip");
}
