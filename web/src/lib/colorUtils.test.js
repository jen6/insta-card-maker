import { describe, it, expect } from "vitest";
import {
    parseColorValue,
    hexToRgba,
    replaceAlpha,
    extractOverlayAlpha,
    buildOverlayCss,
} from "./colorUtils.js";

describe("parseColorValue", () => {
    it("parses hex color", () => {
        expect(parseColorValue("#2ca8ff")).toEqual({
            hexApprox: "#2ca8ff",
            alpha: 1,
            isRgba: false,
        });
    });

    it("parses rgba color", () => {
        expect(parseColorValue("rgba(255, 255, 255, 0.72)")).toEqual({
            hexApprox: "#ffffff",
            alpha: 0.72,
            isRgba: true,
        });
    });

    it("returns safe defaults for empty string", () => {
        expect(parseColorValue("")).toEqual({
            hexApprox: "#000000",
            alpha: 1,
            isRgba: false,
        });
    });

    it("returns safe defaults for invalid input", () => {
        expect(parseColorValue("invalid")).toEqual({
            hexApprox: "#000000",
            alpha: 1,
            isRgba: false,
        });
    });

    it("handles 3-digit hex", () => {
        const result = parseColorValue("#fff");
        expect(result.hexApprox).toBe("#fff");
        expect(result.isRgba).toBe(false);
    });
});

describe("hexToRgba", () => {
    it("converts hex + alpha to rgba string", () => {
        expect(hexToRgba("#ffffff", 0.72)).toBe("rgba(255, 255, 255, 0.72)");
    });

    it("converts dark hex", () => {
        expect(hexToRgba("#000000", 1)).toBe("rgba(0, 0, 0, 1)");
    });
});

describe("replaceAlpha", () => {
    it("replaces alpha while preserving RGB", () => {
        expect(replaceAlpha("rgba(255, 255, 255, 0.72)", 0.5)).toBe(
            "rgba(255, 255, 255, 0.5)"
        );
    });

    it("returns original string if not rgba", () => {
        expect(replaceAlpha("not-rgba", 0.5)).toBe("not-rgba");
    });

    it("returns original hex string unchanged", () => {
        expect(replaceAlpha("#ffffff", 0.5)).toBe("#ffffff");
    });
});

describe("extractOverlayAlpha", () => {
    it("extracts alpha from overlay CSS", () => {
        expect(
            extractOverlayAlpha(
                "linear-gradient(rgba(0, 0, 0, 0.58), rgba(0, 0, 0, 0.58))"
            )
        ).toBe(0.58);
    });

    it("returns 0.5 for empty string", () => {
        expect(extractOverlayAlpha("")).toBe(0.5);
    });

    it("returns 0.5 for null/undefined", () => {
        expect(extractOverlayAlpha(null)).toBe(0.5);
        expect(extractOverlayAlpha(undefined)).toBe(0.5);
    });
});

describe("buildOverlayCss", () => {
    it("builds overlay CSS from alpha", () => {
        expect(buildOverlayCss(0.6)).toBe(
            "linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.6))"
        );
    });

    it("handles zero alpha", () => {
        expect(buildOverlayCss(0)).toBe(
            "linear-gradient(rgba(0, 0, 0, 0), rgba(0, 0, 0, 0))"
        );
    });
});
