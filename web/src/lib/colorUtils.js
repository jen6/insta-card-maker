/**
 * 색상 유틸리티 함수 모듈
 *
 * PresetEditor에서 사용하는 색상 파싱, 변환, 오버레이 CSS 생성 함수들을 제공한다.
 * Requirements: 2.3, 2.5, 2.6, 3.2, 3.3, 4.6, 4.7
 */

/**
 * 색상 값을 파싱하여 hex 근사값, 알파, rgba 여부를 반환한다.
 * @param {string} value - hex 또는 rgba 색상 문자열
 * @returns {{ hexApprox: string, alpha: number, isRgba: boolean }}
 */
export function parseColorValue(value) {
    const rgbaMatch =
        /^rgba\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*([\d.]+)\s*\)$/.exec(
            value
        );
    if (rgbaMatch) {
        const r = parseInt(rgbaMatch[1], 10);
        const g = parseInt(rgbaMatch[2], 10);
        const b = parseInt(rgbaMatch[3], 10);
        const a = parseFloat(rgbaMatch[4]);
        const hex = `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
        return { hexApprox: hex, alpha: a, isRgba: true };
    }
    // hex 또는 기타
    const hexMatch = /^#[0-9a-fA-F]{3,6}$/.test(value || "");
    return { hexApprox: hexMatch ? value : "#000000", alpha: 1, isRgba: false };
}

/**
 * hex 색상과 알파 값을 rgba 문자열로 변환한다.
 * @param {string} hex - "#rrggbb" 형식
 * @param {number} alpha - 0~1
 * @returns {string} "rgba(r, g, b, a)"
 */
export function hexToRgba(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * rgba 문자열의 알파 값만 교체한다. RGB 부분은 유지된다.
 * rgba가 아닌 문자열이 전달되면 원본 문자열을 그대로 반환한다.
 * @param {string} rgba - "rgba(r, g, b, a)" 형식
 * @param {number} newAlpha - 새 알파 값
 * @returns {string} 업데이트된 rgba 문자열
 */
export function replaceAlpha(rgba, newAlpha) {
    return rgba.replace(
        /rgba\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*[\d.]+\s*\)/,
        `rgba($1, $2, $3, ${newAlpha})`
    );
}

/**
 * imageOverlay CSS에서 알파 값을 추출한다.
 * "linear-gradient(rgba(0, 0, 0, 0.58), rgba(0, 0, 0, 0.58))" → 0.58
 * 유효하지 않은 CSS가 전달되면 기본값 0.5를 반환한다.
 * @param {string} overlay
 * @returns {number} 알파 값 (0~1)
 */
export function extractOverlayAlpha(overlay) {
    const match =
        /rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*([\d.]+)\s*\)/.exec(
            overlay || ""
        );
    return match ? parseFloat(match[1]) : 0.5;
}

/**
 * 알파 값으로 imageOverlay CSS를 생성한다.
 * @param {number} alpha - 0~1
 * @returns {string} "linear-gradient(rgba(0, 0, 0, α), rgba(0, 0, 0, α))"
 */
export function buildOverlayCss(alpha) {
    return `linear-gradient(rgba(0, 0, 0, ${alpha}), rgba(0, 0, 0, ${alpha}))`;
}
