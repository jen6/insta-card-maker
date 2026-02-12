#!/usr/bin/env node

const fs = require("fs/promises");
const path = require("path");
const { program } = require("commander");
const { marked } = require("marked");
const puppeteer = require("puppeteer");
const PRESETS = require("./presets");

marked.setOptions({
  gfm: true,
  breaks: true,
});

program
  .option("-i, --input <path>", "Input markdown file path")
  .option("-o, --output <path>", "Output directory")
  .option("--preset <name>", "Preset name (reference, glow, glowless, paper, sports-hero)", "reference")
  .option("--list-presets", "List available presets")
  .option("--ratio <w:h>", "Aspect ratio (e.g. 4:5, 1:1, 3:4, 4:3)", "4:5")
  .option("--width <number>", "Image width (if omitted, auto from ratio)")
  .option("--height <number>", "Image height (if omitted, auto from ratio)")
  .option("--max-chars <number>", "Max characters per auto-split card", "260")
  .option(
    "--font-family <font>",
    "Preferred font family"
  )
  .option("--bg-color <hex>", "Background color")
  .option("--bg-image <pathOrUrl>", "Background image path or URL")
  .option("--title-color <hex>", "Title color")
  .option("--text-color <hex>", "Body text color")
  .option("--title-scale <number>", "Title size multiplier")
  .option("--body-scale <number>", "Body size multiplier")
  .option("--small-text-scale <number>", "Inline/code size multiplier")
  .option("--title-line-height <number>", "Title line-height")
  .option("--body-line-height <number>", "Body line-height")
  .option(
    "--emphasis-style <style>",
    "Emphasis style (accent-underline, highlight, bold, glow)"
  )
  .parse();

const EMPHASIS_STYLES = new Set(["accent-underline", "highlight", "bold", "glow"]);

function parseOptionalNumber(value, optionName, { min = Number.NEGATIVE_INFINITY } = {}) {
  if (value === undefined) {
    return undefined;
  }

  const num = Number(value);
  if (!Number.isFinite(num) || num <= min) {
    throw new Error(`${optionName} must be a number > ${min}`);
  }

  return num;
}

function mergeTheme(preset, options, backgroundImage) {
  const titleScale = parseOptionalNumber(options.titleScale, "title-scale", { min: 0 });
  const bodyScale = parseOptionalNumber(options.bodyScale, "body-scale", { min: 0 });
  const smallTextScale = parseOptionalNumber(options.smallTextScale, "small-text-scale", { min: 0 });
  const titleLineHeight = parseOptionalNumber(options.titleLineHeight, "title-line-height", { min: 0.5 });
  const bodyLineHeight = parseOptionalNumber(options.bodyLineHeight, "body-line-height", { min: 0.8 });

  const emphasisStyle = options.emphasisStyle || preset.emphasisStyle;
  if (!EMPHASIS_STYLES.has(emphasisStyle)) {
    throw new Error(`Invalid emphasis-style: ${emphasisStyle}`);
  }

  return {
    ...preset,
    fontFamily: options.fontFamily || preset.fontFamily,
    bgColor: options.bgColor || preset.bgColor,
    titleColor: options.titleColor || preset.titleColor,
    textColor: options.textColor || preset.textColor,
    backgroundImage,
    emphasisStyle,
    titleScalePortrait: preset.titleScalePortrait * (titleScale || 1),
    titleScaleLandscape: preset.titleScaleLandscape * (titleScale || 1),
    bodyScalePortrait: preset.bodyScalePortrait * (bodyScale || 1),
    bodyScaleLandscape: preset.bodyScaleLandscape * (bodyScale || 1),
    smallTextScale: smallTextScale || preset.smallTextScale,
    titleLineHeight: titleLineHeight || preset.titleLineHeight,
    bodyLineHeight: bodyLineHeight || preset.bodyLineHeight,
  };
}

function escapeCssUrl(url) {
  return url.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function mimeByExtension(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".png") return "image/png";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".webp") return "image/webp";
  if (ext === ".gif") return "image/gif";
  if (ext === ".svg") return "image/svg+xml";
  return "application/octet-stream";
}

async function resolveBackgroundImage(backgroundImageOption) {
  if (!backgroundImageOption) {
    return "";
  }

  const raw = String(backgroundImageOption).trim();
  if (!raw) {
    return "";
  }

  if (/^(https?:|data:|file:)/i.test(raw)) {
    return raw;
  }

  const resolvedPath = path.resolve(process.cwd(), raw);
  const fileBuffer = await fs.readFile(resolvedPath);
  const mime = mimeByExtension(resolvedPath);
  return `data:${mime};base64,${fileBuffer.toString("base64")}`;
}

function emphasisCss(emphasisStyle) {
  if (emphasisStyle === "highlight") {
    return `
      .body strong,
      .body b,
      .body em,
      .body i {
        font-style: normal;
        font-weight: 760;
        color: #ffffff;
        background: linear-gradient(transparent 58%, color-mix(in srgb, var(--title) 36%, transparent) 58%);
        padding: 0 0.04em;
      }
    `;
  }

  if (emphasisStyle === "glow") {
    return `
      .body strong,
      .body b,
      .body em,
      .body i {
        font-style: normal;
        font-weight: 760;
        color: #ffffff;
        text-shadow: 0 0 0.6em color-mix(in srgb, var(--title) 72%, transparent);
      }
    `;
  }

  if (emphasisStyle === "bold") {
    return `
      .body strong,
      .body b,
      .body em,
      .body i {
        font-style: normal;
        font-weight: 780;
        color: #ffffff;
      }
    `;
  }

  return `
    .body strong,
    .body b,
    .body em,
      .body i {
        font-style: normal;
        font-weight: 760;
        color: #ffffff;
        text-decoration: underline;
        text-decoration-color: color-mix(in srgb, var(--title) 84%, transparent);
        text-decoration-thickness: 0.08em;
        text-underline-offset: 0.08em;
      }
  `;
}

function splitByExplicitDivider(markdown) {
  return markdown
    .split(/\n\s*---+\s*\n/g)
    .map((chunk) => chunk.trim())
    .filter(Boolean);
}

function stripMarkdown(raw) {
  return raw
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[[^\]]*\]\([^)]*\)/g, "$1")
    .replace(/[>#*_~-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function autoSplitMarkdown(markdown, maxChars) {
  const blocks = markdown
    .split(/\n{2,}/)
    .map((chunk) => chunk.trim())
    .filter(Boolean);

  if (!blocks.length) {
    return [];
  }

  const cards = [];
  let current = [];
  let currentLen = 0;

  for (const block of blocks) {
    const plain = stripMarkdown(block);
    const blockLen = plain.length + 2;

    if (current.length > 0 && currentLen + blockLen > maxChars) {
      cards.push(current.join("\n\n"));
      current = [];
      currentLen = 0;
    }

    current.push(block);
    currentLen += blockLen;
  }

  if (current.length > 0) {
    cards.push(current.join("\n\n"));
  }

  return cards;
}

function parseCard(cardMarkdown) {
  const tokens = marked.lexer(cardMarkdown);
  let title = "";
  const bodyTokens = [];

  for (const token of tokens) {
    if (!title && token.type === "heading") {
      title = token.text.trim();
      continue;
    }

    bodyTokens.push(token);
  }

  const bodyMarkdown = bodyTokens.map((token) => token.raw || "").join("");
  const bodyHtml = marked.parse(bodyMarkdown || "");
  const plainLength = stripMarkdown(cardMarkdown).length;

  return {
    title,
    bodyHtml,
    bodyTokens,
    plainLength,
  };
}

function firstHeadingText(markdown) {
  const tokens = marked.lexer(markdown || "");
  for (const token of tokens) {
    if (token.type === "heading" && token.text) {
      return String(token.text).trim();
    }
  }
  return "";
}

function formatLocalDateYYYYMMDD(date) {
  const y = String(date.getFullYear());
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function sanitizeTitleForDir(title) {
  const normalized = String(title || "").normalize("NFKC");
  const cleaned = normalized
    .replace(/\s+/g, "-")
    .replace(/[^\p{L}\p{N}\-_]/gu, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return cleaned || "untitled";
}

function resolveOutputDir(outputOption, markdown, inputPath) {
  if (outputOption) {
    return path.resolve(process.cwd(), outputOption);
  }

  const datePart = formatLocalDateYYYYMMDD(new Date());
  const title = firstHeadingText(markdown) || path.basename(inputPath, path.extname(inputPath));
  const safeTitle = sanitizeTitleForDir(title);

  return path.resolve(process.cwd(), "output", `${datePart}-${safeTitle}`);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function parseRatio(ratioText) {
  const matched = /^(\d+(?:\.\d+)?)\s*:\s*(\d+(?:\.\d+)?)$/.exec(String(ratioText || "").trim());
  if (!matched) {
    throw new Error(`Invalid ratio format: ${ratioText}. Use w:h (e.g. 4:5, 1:1, 3:3)`);
  }

  const ratioW = Number(matched[1]);
  const ratioH = Number(matched[2]);

  if (!Number.isFinite(ratioW) || !Number.isFinite(ratioH) || ratioW <= 0 || ratioH <= 0) {
    throw new Error(`Invalid ratio values: ${ratioText}`);
  }

  return { ratioW, ratioH };
}

function resolveDimensions({ widthInput, heightInput, ratioW, ratioH }) {
  const hasWidth = widthInput !== undefined;
  const hasHeight = heightInput !== undefined;

  if (hasWidth && hasHeight) {
    return { width: widthInput, height: heightInput };
  }

  if (hasWidth) {
    return { width: widthInput, height: Math.round((widthInput * ratioH) / ratioW) };
  }

  if (hasHeight) {
    return { width: Math.round((heightInput * ratioW) / ratioH), height: heightInput };
  }

  const defaultWidth = 1080;
  return { width: defaultWidth, height: Math.round((defaultWidth * ratioH) / ratioW) };
}

function textScaleByLength(length) {
  if (length <= 120) {
    return 1;
  }

  if (length >= 620) {
    return 0.78;
  }

  const slope = (0.78 - 1) / (620 - 120);
  return clamp(1 + slope * (length - 120), 0.78, 1);
}

function parseInlineText(raw) {
  if (!raw) return "";
  return marked.parseInline(String(raw).trim().replace(/\\n/g, "<br/>")).trim();
}

function extractHeroContent(card) {
  const slots = {
    logo: "",
    kicker: "",
    center: "",
    left: "",
    right: "",
    bottom: "",
    points: [],
  };

  const plain = [];
  const headings = [];

  const pushByMarker = (text, { preferPoint = false } = {}) => {
    const raw = String(text || "").trim();
    if (!raw) return;

    const matched = raw.match(/^\[(logo|kicker|center|left|right|bottom|point)\]\s*(.+)$/i);
    if (matched) {
      const key = matched[1].toLowerCase();
      const value = parseInlineText(matched[2]);
      if (!value) return;
      if (key === "point") {
        slots.points.push(value);
      } else {
        slots[key] = value;
      }
      return;
    }

    const value = parseInlineText(raw);
    if (!value) return;
    if (preferPoint) {
      slots.points.push(value);
    } else {
      plain.push(value);
    }
  };

  for (const token of card.bodyTokens || []) {
    if (token.type === "heading") {
      const value = parseInlineText(token.text);
      if (value) headings.push(value);
      continue;
    }

    if (token.type === "paragraph") {
      const lines = String(token.text || "")
        .split(/\n+/)
        .map((line) => line.trim())
        .filter(Boolean);

      if (!lines.length) {
        continue;
      }

      for (const line of lines) {
        pushByMarker(line);
      }
      continue;
    }

    if (token.type === "list") {
      for (const item of token.items || []) {
        pushByMarker(item.text, { preferPoint: true });
      }
    }
  }

  if (!slots.center) {
    slots.center = parseInlineText(card.title || "") || headings[0] || plain[0] || "";
  }

  if (!slots.kicker) {
    slots.kicker = headings[0] || plain[0] || "";
  }

  if (!slots.left && slots.points[0]) {
    slots.left = slots.points[0];
  }

  if (!slots.right && slots.points[1]) {
    slots.right = slots.points[1];
  }

  if (!slots.bottom) {
    const candidates = plain.filter((item) => item && item !== slots.kicker && item !== slots.center);
    slots.bottom = candidates[candidates.length - 1] || slots.points[2] || "";
  }

  return slots;
}

function renderHeroOverlayHtml({
  card,
  width,
  height,
  fontFamily,
  theme,
}) {
  const base = Math.min(width, height);
  const slots = extractHeroContent(card);
  const imageLayer = theme.backgroundImage
    ? `${theme.imageOverlay}, url("${escapeCssUrl(theme.backgroundImage)}"), `
    : "";

  const titleSize = Math.round(base * (theme.heroTitleScale || 0.086));
  const kickerSize = Math.round(base * (theme.heroKickerScale || 0.032));
  const calloutSize = Math.round(base * (theme.heroCalloutScale || 0.031));
  const bottomSize = Math.round(base * (theme.heroBottomScale || 0.038));
  const logoSize = Math.round(base * (theme.heroLogoScale || 0.031));
  const padX = Math.round(width * (theme.heroPadXRatio || 0.075));
  const padTop = Math.round(height * (theme.heroPadTopRatio || 0.06));
  const padBottom = Math.round(height * (theme.heroPadBottomRatio || 0.07));

  return `<!doctype html>
<html lang="ko">
  <head>
    <meta charset="utf-8" />
    <style>
      :root {
        --bg: ${theme.bgColor};
        --title: ${theme.titleColor};
        --text: ${theme.textColor};
        --muted: ${theme.mutedColor};
        --panel: ${theme.panelColor};
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        width: ${width}px;
        height: ${height}px;
        background:
          ${imageLayer}${theme.backgroundLayers},
          var(--bg);
        background-repeat: no-repeat;
        background-size: cover;
        background-position: center;
        font-family: ${fontFamily};
        color: var(--text);
        text-rendering: optimizeLegibility;
        -webkit-font-smoothing: antialiased;
      }

      .hero-card {
        width: 100%;
        height: 100%;
        position: relative;
        overflow: hidden;
        padding: ${padTop}px ${padX}px ${padBottom}px;
      }

      .hero-vignette {
        position: absolute;
        inset: 0;
        background:
          linear-gradient(to bottom, rgba(0, 0, 0, 0.34) 0%, rgba(0, 0, 0, 0.08) 40%, rgba(0, 0, 0, 0.5) 100%),
          radial-gradient(circle at 48% 36%, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0.36) 84%);
        pointer-events: none;
      }

      .hero-logo {
        position: absolute;
        top: ${Math.round(height * 0.03)}px;
        left: 50%;
        transform: translateX(-50%);
        font-size: var(--logo-size);
        font-weight: 800;
        letter-spacing: 0.01em;
        color: rgba(255, 255, 255, 0.96);
        text-shadow: 0 3px 16px rgba(0, 0, 0, 0.35);
      }

      .hero-kicker {
        position: absolute;
        top: ${Math.round(height * 0.1)}px;
        left: ${padX}px;
        right: ${padX}px;
        text-align: center;
        font-size: var(--kicker-size);
        line-height: 1.24;
        font-weight: 760;
        letter-spacing: -0.02em;
        color: rgba(255, 255, 255, 0.98);
        text-shadow: 0 4px 20px rgba(0, 0, 0, 0.44);
      }

      .hero-title {
        position: absolute;
        top: 41%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 88%;
        margin: 0;
        text-align: center;
        font-size: var(--title-size);
        line-height: 1.12;
        font-weight: 860;
        letter-spacing: -0.04em;
        color: var(--title);
        text-shadow: 0 10px 28px rgba(0, 0, 0, 0.5);
        text-wrap: balance;
        word-break: keep-all;
        line-break: strict;
      }

      .hero-callout {
        position: absolute;
        width: 37%;
        padding: 0.5em 0.6em 0.56em;
        border-radius: 0.34em;
        background: color-mix(in srgb, var(--panel) 84%, rgba(0, 0, 0, 0.42));
        backdrop-filter: blur(1px);
        font-size: var(--callout-size);
        line-height: 1.34;
        font-weight: 700;
        letter-spacing: -0.02em;
        color: #f5fdff;
        text-shadow: 0 3px 14px rgba(0, 0, 0, 0.45);
      }

      .hero-left {
        top: 54%;
        left: ${padX}px;
        text-align: left;
      }

      .hero-right {
        top: 63%;
        right: ${padX}px;
        text-align: left;
      }

      .hero-bottom {
        position: absolute;
        left: ${padX}px;
        right: ${padX}px;
        bottom: ${Math.round(height * 0.04)}px;
        text-align: center;
        font-size: var(--bottom-size);
        line-height: 1.28;
        font-weight: 740;
        letter-spacing: -0.02em;
        color: rgba(255, 255, 255, 0.95);
        text-shadow: 0 5px 20px rgba(0, 0, 0, 0.5);
        word-break: keep-all;
        line-break: strict;
      }
    </style>
  </head>
  <body>
    <main class="hero-card">
      <div class="hero-vignette"></div>
      ${slots.logo ? `<div class="hero-logo fit">${slots.logo}</div>` : ""}
      ${slots.kicker ? `<div class="hero-kicker fit">${slots.kicker}</div>` : ""}
      ${slots.center ? `<h1 class="hero-title fit">${slots.center}</h1>` : ""}
      ${slots.left ? `<div class="hero-callout hero-left fit">${slots.left}</div>` : ""}
      ${slots.right ? `<div class="hero-callout hero-right fit">${slots.right}</div>` : ""}
      ${slots.bottom ? `<div class="hero-bottom fit">${slots.bottom}</div>` : ""}
    </main>
    <script>
      (() => {
        const root = document.documentElement;
        const card = document.querySelector(".hero-card");
        let title = ${titleSize};
        let kicker = ${kickerSize};
        let callout = ${calloutSize};
        let bottom = ${bottomSize};
        let logo = ${logoSize};

        root.style.setProperty("--title-size", title + "px");
        root.style.setProperty("--kicker-size", kicker + "px");
        root.style.setProperty("--callout-size", callout + "px");
        root.style.setProperty("--bottom-size", bottom + "px");
        root.style.setProperty("--logo-size", logo + "px");

        const overflow = () => card.scrollHeight > card.clientHeight + 1 || card.scrollWidth > card.clientWidth + 1;

        for (let i = 0; i < 28 && overflow(); i += 1) {
          title = Math.max(${Math.round(base * 0.048)}, Math.round(title * 0.97));
          kicker = Math.max(${Math.round(base * 0.022)}, Math.round(kicker * 0.97));
          callout = Math.max(${Math.round(base * 0.022)}, Math.round(callout * 0.97));
          bottom = Math.max(${Math.round(base * 0.026)}, Math.round(bottom * 0.97));
          logo = Math.max(${Math.round(base * 0.02)}, Math.round(logo * 0.97));
          root.style.setProperty("--title-size", title + "px");
          root.style.setProperty("--kicker-size", kicker + "px");
          root.style.setProperty("--callout-size", callout + "px");
          root.style.setProperty("--bottom-size", bottom + "px");
          root.style.setProperty("--logo-size", logo + "px");
        }
      })();
    </script>
  </body>
</html>`;
}

function renderCardHtml({
  card,
  width,
  height,
  fontFamily,
  theme,
}) {
  if (theme.layout === "hero-overlay") {
    return renderHeroOverlayHtml({ card, width, height, fontFamily, theme });
  }

  const base = Math.min(width, height);
  const isPortrait = height >= width;
  const scale = textScaleByLength(card.plainLength);
  const titleSize = Math.round(
    base *
      (isPortrait ? theme.titleScalePortrait : theme.titleScaleLandscape) *
      Math.max(scale, theme.titleScaleFloor)
  );
  const bodySize = Math.round(base * (isPortrait ? theme.bodyScalePortrait : theme.bodyScaleLandscape) * scale);
  const smallSize = Math.round(bodySize * theme.smallTextScale);
  const padX = Math.round(width * theme.padXRatio);
  const padTop = Math.round(height * theme.padTopRatio);
  const padBottom = Math.round(height * theme.padBottomRatio);
  const titleGap = Math.round(base * theme.titleGapRatio);
  const titleMin = Math.round(base * theme.titleMinScale);
  const bodyMin = Math.round(base * theme.bodyMinScale);

  const imageLayer = theme.backgroundImage
    ? `${theme.imageOverlay}, url("${escapeCssUrl(theme.backgroundImage)}"), `
    : "";
  const emphasisStyles = emphasisCss(theme.emphasisStyle);

  return `<!doctype html>
<html lang="ko">
  <head>
    <meta charset="utf-8" />
    <style>
      :root {
        --bg: ${theme.bgColor};
        --title: ${theme.titleColor};
        --text: ${theme.textColor};
        --muted: ${theme.mutedColor};
        --line: ${theme.lineColor};
        --panel: ${theme.panelColor};
        --panel-strong: ${theme.panelStrongColor};
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        width: ${width}px;
        height: ${height}px;
        background-color: var(--bg);
        background:
          ${imageLayer}${theme.backgroundLayers},
          var(--bg);
        background-repeat: no-repeat;
        background-size: cover;
        background-position: center;
        color: var(--text);
        font-family: ${fontFamily};
        text-rendering: optimizeLegibility;
        -webkit-font-smoothing: antialiased;
      }

      .card {
        width: 100%;
        height: 100%;
        padding: ${padTop}px ${padX}px ${padBottom}px ${padX}px;
        display: flex;
        flex-direction: column;
        position: relative;
        overflow: hidden;
      }

      h1 {
        margin: 0 0 ${titleGap}px 0;
        font-size: var(--title-size);
        line-height: ${theme.titleLineHeight};
        font-weight: ${theme.titleWeight};
        color: var(--title);
        letter-spacing: ${theme.titleLetterSpacing}em;
        max-width: 96%;
        text-wrap: balance;
        word-break: keep-all;
        line-break: strict;
      }

      .body {
        font-size: var(--body-size);
        line-height: ${theme.bodyLineHeight};
        letter-spacing: ${theme.bodyLetterSpacing}em;
        overflow: hidden;
        max-width: 100%;
        color: var(--text);
      }

      ${emphasisStyles}

      .body > *:first-child {
        margin-top: 0;
      }

      .body > *:last-child {
        margin-bottom: 0;
      }

      .body h2,
      .body h3,
      .body h4,
      .body h5,
      .body h6 {
        margin: 0.2em 0 0.55em;
        line-height: 1.28;
        letter-spacing: -0.02em;
        color: #ffffff;
        word-break: keep-all;
        line-break: strict;
      }

      .body h2 { font-size: 1.18em; font-weight: 760; }
      .body h3 { font-size: 1.1em; font-weight: 740; }
      .body h4 { font-size: 1.02em; font-weight: 700; }
      .body h5,
      .body h6 { font-size: 0.95em; font-weight: 680; color: var(--muted); }

      .body a {
        color: var(--title);
        text-decoration: underline;
        text-underline-offset: 0.12em;
        word-break: break-all;
      }

      .body p {
        margin: 0 0 0.9em 0;
        word-break: keep-all;
        line-break: strict;
      }

      .body blockquote {
        margin: 0 0 0.95em 0;
        padding: 0.55em 0.8em 0.6em;
        border-left: 0.2em solid var(--title);
        background: linear-gradient(90deg, color-mix(in srgb, var(--title) 16%, transparent) 0%, rgba(255, 255, 255, 0.03) 100%);
        border-radius: 0.22em;
        color: #f1f1f1;
      }

      .body blockquote p {
        margin-bottom: 0.55em;
      }

      .body p:last-child {
        margin-bottom: 0;
      }

      .body ul,
      .body ol {
        margin: 0 0 0.9em 0;
        padding-left: 1.15em;
      }

      .body li {
        margin-bottom: 0.42em;
        word-break: keep-all;
        line-break: strict;
      }

      .body ul li::marker,
      .body ol li::marker {
        color: var(--title);
        font-weight: 700;
      }

      .body ul.task-list {
        padding-left: 0;
      }

      .body li.task-list-item {
        list-style: none;
        margin-left: 0;
      }

      .body input[type="checkbox"] {
        width: 0.95em;
        height: 0.95em;
        margin-right: 0.35em;
        transform: translateY(0.08em);
        accent-color: var(--title);
      }

      .body code {
        font-size: ${smallSize}px;
        background: var(--panel-strong);
        border: 1px solid var(--line);
        border-radius: 0.28em;
        padding: 0.08em 0.28em;
        font-family: "SFMono-Regular", "Menlo", "Consolas", monospace;
      }

      .body pre {
        margin: 0 0 0.95em 0;
        padding: 0.72em 0.84em;
        background: rgba(0, 0, 0, 0.42);
        border: 1px solid var(--line);
        border-radius: 0.38em;
        overflow: auto;
      }

      .body pre code {
        font-size: 0.78em;
        display: block;
        background: transparent;
        border: 0;
        padding: 0;
        line-height: 1.45;
        white-space: pre-wrap;
        word-break: break-word;
      }

      .body hr {
        border: 0;
        border-top: 1px solid var(--line);
        margin: 0.9em 0 1em;
      }

      .body table {
        width: 100%;
        table-layout: fixed;
        border-collapse: collapse;
        margin: 0 auto 1em;
        background: var(--panel);
        border: 1px solid var(--line);
        border-radius: 0.4em;
        overflow: hidden;
      }

      .body th,
      .body td {
        border: 1px solid var(--line);
        padding: 0.42em 0.46em;
        text-align: center;
        vertical-align: top;
        word-break: break-word;
      }

      .body th {
        background: color-mix(in srgb, var(--title) 28%, transparent);
        color: #ffffff;
        font-weight: 730;
      }

      .body img {
        display: block;
        width: 100%;
        max-height: 7.2em;
        object-fit: cover;
        border-radius: 0.42em;
        border: 1px solid var(--line);
        margin: 0.2em 0 0.95em;
      }

      .body kbd {
        font-size: 0.78em;
        padding: 0.06em 0.3em;
        border-radius: 0.28em;
        border: 1px solid var(--line);
        background: var(--panel-strong);
      }

    </style>
  </head>
  <body>
    <main class="card">
      ${card.title ? `<h1>${card.title}</h1>` : ""}
      <section class="body">${card.bodyHtml}</section>
    </main>
    <script>
      (() => {
        const root = document.documentElement;
        const card = document.querySelector(".card");
        const title = document.querySelector("h1");
        const body = document.querySelector(".body");

        let currentTitle = ${titleSize};
        let currentBody = ${bodySize};
        const minTitle = ${titleMin};
        const minBody = ${bodyMin};

        root.style.setProperty("--title-size", currentTitle + "px");
        root.style.setProperty("--body-size", currentBody + "px");

        const isOverflowing = () => {
          if (!card || !body) return false;
          const cardOverflow = card.scrollHeight > card.clientHeight + 1;
          const bodyOverflow = body.scrollHeight > body.clientHeight + 1;
          const bodyWidthOverflow = body.scrollWidth > body.clientWidth + 1;
          const titleOverflow = title ? title.scrollWidth > title.clientWidth + 1 : false;
          return cardOverflow || bodyOverflow || bodyWidthOverflow || titleOverflow;
        };

        for (let i = 0; i < 26 && isOverflowing(); i += 1) {
          currentTitle = Math.max(minTitle, Math.round(currentTitle * 0.97));
          currentBody = Math.max(minBody, Math.round(currentBody * 0.975));
          root.style.setProperty("--title-size", currentTitle + "px");
          root.style.setProperty("--body-size", currentBody + "px");
        }
      })();
    </script>
  </body>
</html>`;
}

async function run() {
  const options = program.opts();
  if (options.listPresets) {
    const rows = Object.entries(PRESETS).map(([name, preset]) => `${name}: ${preset.description}`);
    process.stdout.write(`${rows.join("\n")}\n`);
    return;
  }

  const preset = PRESETS[options.preset];
  if (!preset) {
    throw new Error(`Unknown preset: ${options.preset}. Available: ${Object.keys(PRESETS).join(", ")}`);
  }

  const backgroundImage = await resolveBackgroundImage(options.bgImage);
  const theme = mergeTheme(preset, options, backgroundImage);

  if (!options.input) {
    throw new Error("input markdown file is required. Use -i <path>");
  }

  const inputPath = path.resolve(process.cwd(), options.input);
  const widthInput = options.width !== undefined ? Number(options.width) : undefined;
  const heightInput = options.height !== undefined ? Number(options.height) : undefined;
  const { ratioW, ratioH } = parseRatio(options.ratio);
  const { width, height } = resolveDimensions({ widthInput, heightInput, ratioW, ratioH });
  const maxChars = Number(options.maxChars);

  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    throw new Error("width/height must be positive numbers");
  }

  if (
    (widthInput !== undefined && (!Number.isFinite(widthInput) || widthInput <= 0)) ||
    (heightInput !== undefined && (!Number.isFinite(heightInput) || heightInput <= 0))
  ) {
    throw new Error("width/height must be positive numbers");
  }

  if (!Number.isFinite(maxChars) || maxChars < 120) {
    throw new Error("max-chars must be a number >= 120");
  }

  const markdown = await fs.readFile(inputPath, "utf8");
  const outputDir = resolveOutputDir(options.output, markdown, inputPath);

  const explicit = splitByExplicitDivider(markdown);
  const rawCards = explicit.length > 1 ? explicit : autoSplitMarkdown(markdown, maxChars);

  if (!rawCards.length) {
    throw new Error("No content found in markdown file");
  }

  const cards = rawCards.map(parseCard);

  await fs.mkdir(outputDir, { recursive: true });

  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  await page.setViewport({ width, height, deviceScaleFactor: 2 });

  for (let i = 0; i < cards.length; i += 1) {
    const html = renderCardHtml({
      card: cards[i],
      width,
      height,
      fontFamily: theme.fontFamily,
      theme,
    });

    await page.setContent(html, { waitUntil: "domcontentloaded" });
    await page.evaluate(async () => {
      if (document.fonts && document.fonts.ready) {
        await document.fonts.ready;
      }

      const images = Array.from(document.images || []);
      await Promise.all(
        images.map((img) => {
          if (img.complete) {
            return Promise.resolve();
          }

          return new Promise((resolve) => {
            const done = () => resolve();
            img.addEventListener("load", done, { once: true });
            img.addEventListener("error", done, { once: true });
            setTimeout(done, 2500);
          });
        })
      );
    });

    const filename = `${String(i + 1).padStart(2, "0")}.png`;
    const filepath = path.join(outputDir, filename);

    await page.screenshot({
      path: filepath,
      type: "png",
      fullPage: false,
    });

    process.stdout.write(`Saved ${filepath}\n`);
  }

  await browser.close();
}

run().catch((error) => {
  process.stderr.write(`Error: ${error.message}\n`);
  process.exit(1);
});
