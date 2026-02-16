import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { ChevronDown, ChevronRight, History } from "lucide-react";
import { validatePreset } from "@/lib/presetValidator";
import { renderMarkdownToCards } from "@/lib/renderer";
import { parseColorValue, hexToRgba, replaceAlpha, extractOverlayAlpha, buildOverlayCss } from "../lib/colorUtils.js";

const SAMPLE_MARKDOWN = `# 미리보기 제목

이것은 프리셋 **미리보기**입니다.

다양한 스타일을 실시간으로 확인해보세요.`;

function ColorField({ label, value, onChange }) {
    const { hexApprox, alpha, isRgba } = parseColorValue(value);
    return (
        <div className="pe-field">
            <label className="pe-field-label">{label}</label>
            <div className="pe-color-row">
                <input
                    type="color"
                    value={hexApprox}
                    onChange={(e) => {
                        if (isRgba) {
                            onChange(hexToRgba(e.target.value, alpha));
                        } else {
                            onChange(e.target.value);
                        }
                    }}
                    className="pe-color-swatch"
                />
                <input type="text" value={value || ""} onChange={(e) => onChange(e.target.value)} className="pe-input" placeholder="#000000 또는 rgba(...)" />
            </div>
            {isRgba && (
                <div className="pe-alpha-row">
                    <label>투명도</label>
                    <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={alpha}
                        onChange={(e) => onChange(replaceAlpha(value, parseFloat(e.target.value)))}
                    />
                    <span>{alpha.toFixed(2)}</span>
                </div>
            )}
        </div>
    );
}

const COLOR_FIELDS = [
    { key: "bgColor", label: "배경색" },
    { key: "titleColor", label: "제목색" },
    { key: "textColor", label: "본문색" },
    { key: "mutedColor", label: "보조색" },
    { key: "lineColor", label: "구분선" },
    { key: "panelColor", label: "패널색" },
    { key: "panelStrongColor", label: "패널 강조" },
];

const SCALE_FIELDS = [
    { key: "titleScalePortrait", label: "제목 크기 (세로)" },
    { key: "titleScaleFloor", label: "제목 최소 비율" },
    { key: "bodyScalePortrait", label: "본문 크기 (세로)" },
    { key: "smallTextScale", label: "작은 텍스트" },
];

const LAYOUT_FIELDS = [
    { key: "padXRatio", label: "좌우 패딩" },
    { key: "padTopRatio", label: "상단 패딩" },
    { key: "padBottomRatio", label: "하단 패딩" },
    { key: "titleGapRatio", label: "제목-본문 간격" },
];

const EMPHASIS_OPTIONS = [
    { value: "accent-underline", label: "Accent Underline" },
    { value: "highlight", label: "Highlight" },
    { value: "bold", label: "Bold" },
    { value: "glow", label: "Glow" },
];

const FONT_OPTIONS = [
    { value: "Pretendard, 'Apple SD Gothic Neo', 'Noto Sans KR', 'Malgun Gothic', sans-serif", label: "Pretendard" },
    { value: "'SUIT Variable', Pretendard, 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif", label: "SUIT" },
    { value: "'Noto Sans KR', 'Apple SD Gothic Neo', sans-serif", label: "Noto Sans KR" },
    { value: "'IBM Plex Sans KR', 'Pretendard', sans-serif", label: "IBM Plex Sans KR" },
    { value: "system-ui, -apple-system, sans-serif", label: "System UI" },
    { value: "'Nanum Gothic', sans-serif", label: "나눔고딕" },
    { value: "'Nanum Myeongjo', serif", label: "나눔명조" },
];

const GRADIENT_PRESETS = [
    {
        value: "none",
        label: "없음 (단색 배경)",
    },
    {
        value: "radial-gradient(circle at 8% 5%, rgba(44, 168, 255, 0.12) 0%, rgba(44, 168, 255, 0) 38%), radial-gradient(circle at 88% 88%, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0) 42%), radial-gradient(circle at 10% 0%, #101014 0%, var(--bg) 46%)",
        label: "은은한 빛 (Reference)",
    },
    {
        value: "radial-gradient(circle at 12% 8%, rgba(36, 213, 255, 0.2) 0%, rgba(36, 213, 255, 0) 38%), radial-gradient(circle at 85% 90%, rgba(0, 125, 255, 0.14) 0%, rgba(0, 125, 255, 0) 44%), linear-gradient(145deg, #03040a 0%, #070b1a 54%, #05070f 100%)",
        label: "코너 글로우 (Glow)",
    },
    {
        value: "linear-gradient(145deg, #03040a 0%, #070b1a 54%, #05070f 100%)",
        label: "대각선 그라데이션",
    },
    {
        value: "__custom__",
        label: "직접 입력",
    },
];

function GradientBuilder({ backgroundLayers, imageOverlay, onBgChange, onOverlayChange }) {
    const currentPreset = GRADIENT_PRESETS.find((p) => p.value === backgroundLayers);
    const isCustom = !currentPreset || currentPreset.value === "__custom__";

    const overlayAlpha = extractOverlayAlpha(imageOverlay);

    const handlePresetSelect = (e) => {
        const selected = e.target.value;
        if (selected === "__custom__") {
            // Keep current backgroundLayers value when switching to custom mode
            return;
        }
        onBgChange(selected);
    };

    return (
        <>
            <div className="pe-field">
                <label className="pe-field-label">배경 그라데이션</label>
                <select
                    value={isCustom ? "__custom__" : backgroundLayers}
                    onChange={handlePresetSelect}
                    className="pe-select"
                >
                    {GRADIENT_PRESETS.map((p) => (
                        <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                </select>
            </div>

            {isCustom && (
                <div className="pe-field">
                    <label className="pe-field-label">CSS 직접 입력</label>
                    <input
                        type="text"
                        value={backgroundLayers || ""}
                        onChange={(e) => onBgChange(e.target.value)}
                        className="pe-input"
                        placeholder="CSS gradient 값을 입력하세요"
                    />
                </div>
            )}

            <div className="pe-field">
                <label className="pe-field-label">이미지 오버레이 투명도</label>
                <div className="pe-scale-row">
                    <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={overlayAlpha}
                        onChange={(e) => onOverlayChange(buildOverlayCss(parseFloat(e.target.value)))}
                        className="pe-slider"
                    />
                    <span className="pe-scale-val">{Math.round(overlayAlpha * 100)}%</span>
                </div>
            </div>
        </>
    );
}

function Section({ title, defaultOpen = false, children }) {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <div className="pe-section">
            <button type="button" className="pe-section-toggle" onClick={() => setOpen((v) => !v)}>
                {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                <span>{title}</span>
            </button>
            {open && <div className="pe-section-body">{children}</div>}
        </div>
    );
}



function ScaleField({ label, value, onChange }) {
    const num = typeof value === "number" ? value : 0;
    return (
        <div className="pe-scale-field-inline">
            <label className="pe-field-label">{label}</label>
            <div className="pe-scale-row">
                <input type="range" min="0.01" max="1" step="0.001" value={num} onChange={(e) => onChange(parseFloat(e.target.value))} className="pe-slider" />
                <span className="pe-scale-val">{num.toFixed(3)}</span>
            </div>
        </div>
    );
}

function LivePreview({ preset, markdown, ratio, onRatioChange }) {
    const iframeRef = useRef(null);
    const [blobUrl, setBlobUrl] = useState(null);

    useEffect(() => {
        const md = markdown?.trim() || SAMPLE_MARKDOWN;
        try {
            const tempPresets = { __preview__: preset };
            const data = renderMarkdownToCards(md, {
                preset: "__preview__",
                ratio: ratio || "4:5",
                presets: tempPresets,
            });
            if (data.cards.length > 0) {
                const blob = new Blob([data.cards[0]], { type: "text/html" });
                const url = URL.createObjectURL(blob);
                setBlobUrl((prev) => {
                    if (prev) URL.revokeObjectURL(prev);
                    return url;
                });
            }
        } catch {
            // ignore render errors during editing
        }
    }, [preset, markdown, ratio]);

    useEffect(() => {
        return () => {
            if (blobUrl) URL.revokeObjectURL(blobUrl);
        };
    }, []);

    const isSquare = ratio === "1:1";
    const frameW = 1080;
    const frameH = ratio === "1:1" ? 1080 : 1350;

    return (
        <div className="pe-preview">
            <div className="pe-preview-top">
                <span className="pe-preview-label">미리보기</span>
                <div className="pe-ratio-toggle">
                    <button
                        type="button"
                        className={`pe-ratio-btn ${ratio === "1:1" ? "is-active" : ""}`}
                        onClick={() => onRatioChange("1:1")}
                    >1:1</button>
                    <button
                        type="button"
                        className={`pe-ratio-btn ${ratio === "4:5" ? "is-active" : ""}`}
                        onClick={() => onRatioChange("4:5")}
                    >4:5</button>
                </div>
            </div>

            {blobUrl && (
                <div className="pe-preview-card" data-ratio={ratio}>
                    <iframe
                        ref={iframeRef}
                        src={blobUrl}
                        width={frameW}
                        height={frameH}
                        title="preset-preview"
                        style={{
                            border: "none",
                            display: "block",
                            transform: `scale(${260 / frameW})`,
                            transformOrigin: "top left",
                            pointerEvents: "none",
                        }}
                    />
                </div>
            )}

            <p className="pe-preview-hint">
                프리셋은 1:1, 4:5 비율에 따라 레이아웃이 유동적으로 변합니다.
            </p>

            <div className="pe-pro-tip">
                <div className="pe-pro-tip-badge">
                    <span className="pe-pro-tip-icon">ℹ</span>
                    <span>PRO TIP</span>
                </div>
                <p className="pe-pro-tip-text">
                    '제목 최소 비율'을 높게 설정할수록 작은 화면에서도 제목의 크기가 일정하게 유지됩니다.
                </p>
            </div>
        </div>
    );
}

export default function PresetEditor({ initialName, initialPreset, isNew, onSave, onCancel, previewMarkdown, previewRatio }) {
    const [name, setName] = useState(initialName || "");
    const [preset, setPreset] = useState({ ...initialPreset });
    const [errors, setErrors] = useState([]);
    const [localRatio, setLocalRatio] = useState(previewRatio || "4:5");

    const updateField = useCallback((key, value) => {
        setPreset((prev) => ({ ...prev, [key]: value }));
    }, []);

    const handleSave = () => {
        const result = validatePreset(name, preset);
        if (!result.valid) {
            setErrors(result.errors);
            return;
        }
        setErrors([]);
        onSave(name, preset);
    };

    const fieldError = (field) => errors.find((e) => e.field === field)?.error;

    const currentFontOption = FONT_OPTIONS.find((f) => f.value === preset.fontFamily);

    return (
        <div className="pe-root">
            <div className="pe-header">
                <div className="pe-header-left">
                    <button type="button" className="pe-back" onClick={onCancel}>← 목록으로</button>
                </div>
                <button type="button" className="pe-history-link">
                    <History size={13} />
                    <span>프리셋 히스토리</span>
                </button>
            </div>

            <div className="pe-body">
                <div className="pe-form-scroll">
                    <h3 className="pe-title">{isNew ? "새 프리셋 만들기" : "프리셋 편집"}</h3>

                    <Section title="기본 정보" defaultOpen>
                        <div className="pe-field">
                            <label className="pe-field-label">이름 (kebab-case)</label>
                            <input type="text" value={name} onChange={(e) => setName(e.target.value)} disabled={!isNew} className="pe-input" placeholder="pro-tech-dark-v3" />
                            {fieldError("name") && <p className="pe-field-error">{fieldError("name")}</p>}
                        </div>
                        <div className="pe-field">
                            <label className="pe-field-label">설명</label>
                            <textarea
                                value={preset.description || ""}
                                onChange={(e) => updateField("description", e.target.value)}
                                className="pe-textarea"
                                placeholder="Professional dark theme for technical documentation cards."
                                rows={2}
                            />
                        </div>
                        <div className="pe-field">
                            <label className="pe-field-label">글꼴 선택</label>
                            <select
                                value={currentFontOption ? preset.fontFamily : "__custom__"}
                                onChange={(e) => {
                                    if (e.target.value !== "__custom__") updateField("fontFamily", e.target.value);
                                }}
                                className="pe-select"
                            >
                                {FONT_OPTIONS.map((f) => (
                                    <option key={f.value} value={f.value}>{f.label}</option>
                                ))}
                                {!currentFontOption && <option value="__custom__">직접 입력</option>}
                            </select>
                        </div>
                        {!currentFontOption && (
                            <div className="pe-field">
                                <label className="pe-field-label">직접 입력</label>
                                <input type="text" value={preset.fontFamily || ""} onChange={(e) => updateField("fontFamily", e.target.value)} className="pe-input" placeholder="font-family CSS 값" />
                            </div>
                        )}
                        <div className="pe-field">
                            <label className="pe-field-label">강조 스타일</label>
                            <select value={preset.emphasisStyle || "accent-underline"} onChange={(e) => updateField("emphasisStyle", e.target.value)} className="pe-select">
                                {EMPHASIS_OPTIONS.map((opt) => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                            {fieldError("emphasisStyle") && <p className="pe-field-error">{fieldError("emphasisStyle")}</p>}
                        </div>
                    </Section>

                    <Section title="타이포그래피" defaultOpen>
                        <div className="pe-grid-2">
                            <div className="pe-field">
                                <label className="pe-field-label">제목 굵기</label>
                                <input type="number" value={preset.titleWeight || 800} onChange={(e) => updateField("titleWeight", parseInt(e.target.value, 10))} className="pe-input" />
                            </div>
                            <div className="pe-field">
                                <label className="pe-field-label">제목 자간</label>
                                <input type="number" step="0.001" value={preset.titleLetterSpacing ?? -0.03} onChange={(e) => updateField("titleLetterSpacing", parseFloat(e.target.value))} className="pe-input" />
                            </div>
                            <div className="pe-field">
                                <label className="pe-field-label">본문 자간</label>
                                <input type="number" step="0.001" value={preset.bodyLetterSpacing ?? -0.015} onChange={(e) => updateField("bodyLetterSpacing", parseFloat(e.target.value))} className="pe-input" />
                            </div>
                            <div className="pe-field">
                                <label className="pe-field-label">제목 줄 간격</label>
                                <input type="number" step="0.01" value={preset.titleLineHeight ?? 1.2} onChange={(e) => updateField("titleLineHeight", parseFloat(e.target.value))} className="pe-input" />
                            </div>
                        </div>
                        <div className="pe-field">
                            <label className="pe-field-label">본문 줄 간격</label>
                            <input type="number" step="0.01" value={preset.bodyLineHeight ?? 1.52} onChange={(e) => updateField("bodyLineHeight", parseFloat(e.target.value))} className="pe-input" />
                        </div>
                    </Section>

                    <Section title="스케일 (SCALE)">
                        {SCALE_FIELDS.map((f) => (
                            <div key={f.key}>
                                <ScaleField label={f.label} value={preset[f.key]} onChange={(v) => updateField(f.key, v)} />
                                {fieldError(f.key) && <p className="pe-field-error">{fieldError(f.key)}</p>}
                            </div>
                        ))}
                    </Section>

                    <Section title="레이아웃 상세">
                        {LAYOUT_FIELDS.map((f) => (
                            <div key={f.key}>
                                <ScaleField label={f.label} value={preset[f.key]} onChange={(v) => updateField(f.key, v)} />
                            </div>
                        ))}
                    </Section>

                    <Section title="배경 및 그라데이션">
                        <GradientBuilder
                            backgroundLayers={preset.backgroundLayers}
                            imageOverlay={preset.imageOverlay}
                            onBgChange={(v) => updateField("backgroundLayers", v)}
                            onOverlayChange={(v) => updateField("imageOverlay", v)}
                        />
                    </Section>

                    <Section title="색상">
                        {COLOR_FIELDS.map((f) => (
                            <div key={f.key}>
                                <ColorField label={f.label} value={preset[f.key]} onChange={(v) => updateField(f.key, v)} />
                                {fieldError(f.key) && <p className="pe-field-error">{fieldError(f.key)}</p>}
                            </div>
                        ))}
                    </Section>



                    {errors.length > 0 && (
                        <div className="pe-errors">
                            {errors.map((e, i) => (
                                <p key={i}>{e.field}: {e.error}</p>
                            ))}
                        </div>
                    )}
                </div>

                <LivePreview
                    preset={preset}
                    markdown={previewMarkdown}
                    ratio={localRatio}
                    onRatioChange={setLocalRatio}
                />
            </div>

            <div className="pe-actions">
                <button type="button" className="pe-save-btn" onClick={handleSave}>저장하기</button>
                <button type="button" className="pe-cancel-btn" onClick={onCancel}>취소</button>
            </div>
        </div>
    );
}
