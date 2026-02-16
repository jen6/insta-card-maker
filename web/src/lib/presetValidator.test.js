import { describe, it, expect } from "vitest";
import {
    validatePresetName,
    validateColor,
    validateScale,
    validateEmphasisStyle,
    validatePreset,
} from "./presetValidator.js";

describe("validatePresetName", () => {
    it("accepts valid preset names", () => {
        expect(validatePresetName("reference")).toEqual({ valid: true });
        expect(validatePresetName("sports-hero")).toEqual({ valid: true });
        expect(validatePresetName("glow2")).toEqual({ valid: true });
    });

    it("rejects empty string", () => {
        expect(validatePresetName("").valid).toBe(false);
    });

    it("rejects names with uppercase or special chars", () => {
        expect(validatePresetName("MyPreset").valid).toBe(false);
        expect(validatePresetName("has space").valid).toBe(false);
    });
});

describe("validateColor", () => {
    it("accepts hex colors", () => {
        expect(validateColor("#ff0000")).toEqual({ valid: true });
        expect(validateColor("#fff")).toEqual({ valid: true });
    });

    it("accepts rgba colors", () => {
        expect(validateColor("rgba(255, 255, 255, 0.72)")).toEqual({ valid: true });
    });

    it("rejects invalid colors", () => {
        expect(validateColor("red").valid).toBe(false);
        expect(validateColor("").valid).toBe(false);
    });
});

describe("validateScale", () => {
    it("accepts valid scale values", () => {
        expect(validateScale(0.5)).toEqual({ valid: true });
        expect(validateScale(1)).toEqual({ valid: true });
    });

    it("rejects out-of-range values", () => {
        expect(validateScale(0).valid).toBe(false);
        expect(validateScale(1.5).valid).toBe(false);
        expect(validateScale(-0.1).valid).toBe(false);
    });
});

describe("validateEmphasisStyle", () => {
    it("accepts valid styles", () => {
        expect(validateEmphasisStyle("bold")).toEqual({ valid: true });
        expect(validateEmphasisStyle("glow")).toEqual({ valid: true });
    });

    it("rejects invalid styles", () => {
        expect(validateEmphasisStyle("invalid").valid).toBe(false);
    });
});

describe("validatePreset", () => {
    it("validates a valid preset", () => {
        const result = validatePreset("test-preset", {
            bgColor: "#1a1a2e",
            titleColor: "#2ca8ff",
            emphasisStyle: "accent-underline",
        });
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
    });

    it("returns errors for invalid preset data", () => {
        const result = validatePreset("", null);
        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
    });
});
