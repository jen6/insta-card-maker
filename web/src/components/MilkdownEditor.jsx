import { useEffect, useRef } from "react";
import { Crepe, CrepeFeature } from "@milkdown/crepe";
import { replaceAll } from "@milkdown/kit/utils";
// Crepe theme CSS — common (feature styles) + crepe (color variables)
import "@milkdown/crepe/theme/common/style.css";
import "@milkdown/crepe/theme/crepe.css";

/**
 * Milkdown WYSIWYG editor wrapper.
 *
 * Props:
 *  - value: markdown string (source of truth lives in parent)
 *  - onChange: (markdown: string) => void
 *  - onImageUpload: (file: File) => Promise<string>  — returns markdown image ref
 */
export default function MilkdownEditor({ value, onChange, onImageUpload }) {
    const containerRef = useRef(null);
    const crepeRef = useRef(null);
    const onChangeRef = useRef(onChange);
    const suppressNextChange = useRef(false);
    const latestValueRef = useRef(value);

    // Keep callback ref fresh without re-creating the editor
    useEffect(() => {
        onChangeRef.current = onChange;
    }, [onChange]);

    useEffect(() => {
        latestValueRef.current = value;
    }, [value]);

    // Create the Crepe editor once
    useEffect(() => {
        if (!containerRef.current) return;

        const imageUploader = async (file) => {
            if (onImageUpload) {
                return onImageUpload(file);
            }
            // Fallback: convert to data URL
            return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.readAsDataURL(file);
            });
        };

        const crepe = new Crepe({
            root: containerRef.current,
            defaultValue: latestValueRef.current || "",
            features: {
                [CrepeFeature.Toolbar]: true,
                [CrepeFeature.BlockEdit]: true,
                [CrepeFeature.ImageBlock]: true,
                [CrepeFeature.ListItem]: true,
                [CrepeFeature.Placeholder]: true,
                [CrepeFeature.LinkTooltip]: true,
                [CrepeFeature.Cursor]: true,
                [CrepeFeature.Table]: true,
                [CrepeFeature.CodeMirror]: false,
                [CrepeFeature.Latex]: false,
            },
            featureConfigs: {
                [CrepeFeature.Placeholder]: {
                    text: '내용을 입력하세요. "/" 를 입력하면 명령어를 사용할 수 있습니다.',
                    mode: "block",
                },
                [CrepeFeature.ImageBlock]: {
                    onUpload: imageUploader,
                    inlineOnUpload: imageUploader,
                },
            },
        });

        crepe.on((listener) => {
            listener.markdownUpdated((_ctx, markdown) => {
                if (suppressNextChange.current) {
                    suppressNextChange.current = false;
                    return;
                }
                onChangeRef.current?.(markdown);
            });
        });

        crepe.create().then(() => {
            crepeRef.current = crepe;
        });

        return () => {
            crepe.destroy();
            crepeRef.current = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Sync external value changes into the editor (e.g. loading a post)
    const prevValueRef = useRef(value);
    useEffect(() => {
        const crepe = crepeRef.current;
        if (!crepe) return;
        // Only push if the value was changed externally (not from our own onChange)
        if (value !== prevValueRef.current) {
            prevValueRef.current = value;
            const currentMd = crepe.getMarkdown();
            // Normalize for comparison: trim trailing newlines
            if (currentMd.replace(/\n+$/, "") !== value.replace(/\n+$/, "")) {
                suppressNextChange.current = true;
                crepe.editor.action(replaceAll(value));
            }
        }
    }, [value]);

    return (
        <div
            ref={containerRef}
            className="milkdown-editor-root"
        />
    );
}
