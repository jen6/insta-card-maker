// Preset validation module
// Requirements: 7.1, 7.2, 7.3, 7.4, 7.5

const VALID_EMPHASIS_STYLES = ["accent-underline", "highlight", "bold", "glow"];

const COLOR_FIELDS = [
    "bgColor", "titleColor", "textColor", "mutedColor",
    "lineColor", "panelColor", "panelStrongColor",
];

const SCALE_FIELDS = [
    "titleScalePortrait", "titleScaleLandscape", "titleScaleFloor",
    "bodyScalePortrait", "bodyScaleLandscape", "smallTextScale",
    "titleMinScale", "bodyMinScale",
];

// #rgb, #rrggbb (3 or 6 hex digits)
const HEX_RE = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

// rgba(r, g, b, a) — allows integers 0-255 and alpha 0-1 (with decimals)
const RGBA_RE = /^rgba\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*(?:0|1|0?\.\d+|1\.0*)\s*\)$/;

/**
 * Validate preset name: non-empty, lowercase letters + digits + hyphens only.
 */
export function validatePresetName(name) {
    if (typeof name !== "string" || name.length === 0) {
        return { valid: false, error: "프리셋 이름은 비어있을 수 없습니다." };
    }
    if (!/^[a-z0-9-]+$/.test(name)) {
        return { valid: false, error: "프리셋 이름은 영문 소문자, 숫자, 하이픈만 사용할 수 있습니다." };
    }
    return { valid: true };
}

/**
 * Validate CSS color value (hex or rgba).
 */
export function validateColor(value) {
    if (typeof value !== "string") {
        return { valid: false, error: "색상 값은 문자열이어야 합니다." };
    }
    if (HEX_RE.test(value) || RGBA_RE.test(value)) {
        return { valid: true };
    }
    return { valid: false, error: "유효한 CSS 색상 형식이 아닙니다 (hex 또는 rgba)." };
}

/**
 * Validate scale value: must be a number where 0 < value <= 1.
 */
export function validateScale(value) {
    if (typeof value !== "number" || Number.isNaN(value)) {
        return { valid: false, error: "스케일 값은 숫자여야 합니다." };
    }
    if (value <= 0 || value > 1) {
        return { valid: false, error: "스케일 값은 0보다 크고 1 이하여야 합니다." };
    }
    return { valid: true };
}

/**
 * Validate emphasis style.
 */
export function validateEmphasisStyle(value) {
    if (VALID_EMPHASIS_STYLES.includes(value)) {
        return { valid: true };
    }
    return { valid: false, error: `강조 스타일은 ${VALID_EMPHASIS_STYLES.join(", ")} 중 하나여야 합니다.` };
}


/**
 * Validate the full preset object.
 * Returns { valid, errors } where errors is an array of { field, error }.
 */
export function validatePreset(name, preset) {
    const errors = [];

    // Name validation
    const nameResult = validatePresetName(name);
    if (!nameResult.valid) {
        errors.push({ field: "name", error: nameResult.error });
    }

    if (!preset || typeof preset !== "object") {
        errors.push({ field: "preset", error: "프리셋 데이터가 유효하지 않습니다." });
        return { valid: false, errors };
    }

    // Color fields
    for (const field of COLOR_FIELDS) {
        if (preset[field] !== undefined) {
            const result = validateColor(preset[field]);
            if (!result.valid) {
                errors.push({ field, error: result.error });
            }
        }
    }

    // Scale fields
    for (const field of SCALE_FIELDS) {
        if (preset[field] !== undefined) {
            const result = validateScale(preset[field]);
            if (!result.valid) {
                errors.push({ field, error: result.error });
            }
        }
    }

    // Emphasis style
    if (preset.emphasisStyle !== undefined) {
        const result = validateEmphasisStyle(preset.emphasisStyle);
        if (!result.valid) {
            errors.push({ field: "emphasisStyle", error: result.error });
        }
    }

    return { valid: errors.length === 0, errors };
}
