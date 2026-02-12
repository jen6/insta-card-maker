/**
 * Shared rendering logic extracted from cli.js
 * Used by both CLI and web server.
 */

const path = require("path");
const { marked } = require("marked");
const PRESETS = require("./presets");

marked.setOptions({ gfm: true, breaks: true });

const EMPHASIS_STYLES = new Set(["accent-underline", "highlight", "bold", "glow"]);

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function parseRatio(ratioText) {
    const matched = /^(\d+(?:\.\d+)?)\s*:\s*(\d+(?:\.\d+)?)$/.exec(String(ratioText || "").trim());
    if (!matched) throw new Error(`Invalid ratio format: ${ratioText}. Use w:h (e.g. 4:5, 1:1)`);
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
    if (hasWidth && hasHeight) return { width: widthInput, height: heightInput };
    if (hasWidth) return { width: widthInput, height: Math.round((widthInput * ratioH) / ratioW) };
    if (hasHeight) return { width: Math.round((heightInput * ratioW) / ratioH), height: heightInput };
    const defaultWidth = 1080;
    return { width: defaultWidth, height: Math.round((defaultWidth * ratioH) / ratioW) };
}

function textScaleByLength(length) {
    if (length <= 120) return 1;
    if (length >= 620) return 0.78;
    const slope = (0.78 - 1) / (620 - 120);
    return clamp(1 + slope * (length - 120), 0.78, 1);
}

function escapeCssUrl(url) {
    return url.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
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

function splitByExplicitDivider(markdown) {
    return markdown.split(/\n\s*---+\s*\n/g).map((c) => c.trim()).filter(Boolean);
}

function autoSplitMarkdown(markdown, maxChars) {
    const blocks = markdown.split(/\n{2,}/).map((c) => c.trim()).filter(Boolean);
    if (!blocks.length) return [];
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
    if (current.length > 0) cards.push(current.join("\n\n"));
    return cards;
}

function extractCardDirectives(cardMarkdown) {
    const directives = {};
    const cleaned = cardMarkdown.replace(/<!--\s*(bg-image)\s*:\s*(.+?)\s*-->/gi, (_m, key, value) => {
        directives[key.toLowerCase()] = value.trim();
        return "";
    });
    return { directives, cleaned };
}

function parseCard(cardMarkdown) {
    const { directives, cleaned } = extractCardDirectives(cardMarkdown);
    const tokens = marked.lexer(cleaned);
    let title = "";
    const bodyTokens = [];
    for (const token of tokens) {
        if (!title && token.type === "heading") { title = token.text.trim(); continue; }
        bodyTokens.push(token);
    }
    const bodyMarkdown = bodyTokens.map((t) => t.raw || "").join("");
    const bodyHtml = marked.parse(bodyMarkdown || "");
    const plainLength = stripMarkdown(cleaned).length;
    return { title, bodyHtml, bodyTokens, plainLength, directives };
}

function mergeTheme(preset, options, backgroundImage) {
    const titleScale = options.titleScale ? Number(options.titleScale) : undefined;
    const bodyScale = options.bodyScale ? Number(options.bodyScale) : undefined;
    const emphasisStyle = options.emphasisStyle || preset.emphasisStyle;
    if (!EMPHASIS_STYLES.has(emphasisStyle)) throw new Error(`Invalid emphasis-style: ${emphasisStyle}`);
    return {
        ...preset,
        fontFamily: options.fontFamily || preset.fontFamily,
        bgColor: options.bgColor || preset.bgColor,
        titleColor: options.titleColor || preset.titleColor,
        textColor: options.textColor || preset.textColor,
        backgroundImage: backgroundImage || "",
        emphasisStyle,
        titleScalePortrait: preset.titleScalePortrait * (titleScale || 1),
        titleScaleLandscape: preset.titleScaleLandscape * (titleScale || 1),
        bodyScalePortrait: preset.bodyScalePortrait * (bodyScale || 1),
        bodyScaleLandscape: preset.bodyScaleLandscape * (bodyScale || 1),
        smallTextScale: preset.smallTextScale,
        titleLineHeight: preset.titleLineHeight,
        bodyLineHeight: preset.bodyLineHeight,
    };
}

function emphasisCss(emphasisStyle) {
    if (emphasisStyle === "highlight") {
        return `.body strong,.body b,.body em,.body i{font-style:normal;font-weight:760;color:#fff;background:linear-gradient(transparent 58%,color-mix(in srgb,var(--title) 36%,transparent) 58%);padding:0 .04em}`;
    }
    if (emphasisStyle === "glow") {
        return `.body strong,.body b,.body em,.body i{font-style:normal;font-weight:760;color:#fff;text-shadow:0 0 .6em color-mix(in srgb,var(--title) 72%,transparent)}`;
    }
    if (emphasisStyle === "bold") {
        return `.body strong,.body b,.body em,.body i{font-style:normal;font-weight:780;color:#fff}`;
    }
    return `.body strong,.body b,.body em,.body i{font-style:normal;font-weight:760;color:#fff;text-decoration:underline;text-decoration-color:color-mix(in srgb,var(--title) 84%,transparent);text-decoration-thickness:.08em;text-underline-offset:.08em}`;
}

function parseInlineText(raw) {
    if (!raw) return "";
    return marked.parseInline(String(raw).trim().replace(/\\n/g, "<br/>")).trim();
}

function extractHeroContent(card) {
    const slots = { logo: "", kicker: "", center: "", left: "", right: "", bottom: "", points: [] };
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
            if (key === "point") { slots.points.push(value); } else { slots[key] = value; }
            return;
        }
        const value = parseInlineText(raw);
        if (!value) return;
        if (preferPoint) { slots.points.push(value); } else { plain.push(value); }
    };

    for (const token of card.bodyTokens || []) {
        if (token.type === "heading") { const v = parseInlineText(token.text); if (v) headings.push(v); continue; }
        if (token.type === "paragraph") {
            const lines = String(token.text || "").split(/\n+/).map((l) => l.trim()).filter(Boolean);
            for (const line of lines) pushByMarker(line);
            continue;
        }
        if (token.type === "list") {
            for (const item of token.items || []) pushByMarker(item.text, { preferPoint: true });
        }
    }

    if (!slots.center) slots.center = parseInlineText(card.title || "") || headings[0] || plain[0] || "";
    if (!slots.kicker) slots.kicker = headings[0] || plain[0] || "";
    if (!slots.left && slots.points[0]) slots.left = slots.points[0];
    if (!slots.right && slots.points[1]) slots.right = slots.points[1];
    if (!slots.bottom) {
        const candidates = plain.filter((i) => i && i !== slots.kicker && i !== slots.center);
        slots.bottom = candidates[candidates.length - 1] || slots.points[2] || "";
    }
    return slots;
}

function renderHeroOverlayHtml({ card, width, height, fontFamily, theme }) {
    const base = Math.min(width, height);
    const slots = extractHeroContent(card);
    const imageLayer = theme.backgroundImage
        ? `${theme.imageOverlay}, url("${escapeCssUrl(theme.backgroundImage)}"), ` : "";
    const titleSize = Math.round(base * (theme.heroTitleScale || 0.086));
    const kickerSize = Math.round(base * (theme.heroKickerScale || 0.032));
    const calloutSize = Math.round(base * (theme.heroCalloutScale || 0.031));
    const bottomSize = Math.round(base * (theme.heroBottomScale || 0.038));
    const logoSize = Math.round(base * (theme.heroLogoScale || 0.031));
    const padX = Math.round(width * (theme.heroPadXRatio || 0.075));
    const padTop = Math.round(height * (theme.heroPadTopRatio || 0.06));
    const padBottom = Math.round(height * (theme.heroPadBottomRatio || 0.07));

    return `<!doctype html><html lang="ko"><head><meta charset="utf-8"/><style>
:root{--bg:${theme.bgColor};--title:${theme.titleColor};--text:${theme.textColor};--muted:${theme.mutedColor};--panel:${theme.panelColor}}
*{box-sizing:border-box}
body{margin:0;width:${width}px;height:${height}px;background:${imageLayer}${theme.backgroundLayers},var(--bg);background-repeat:no-repeat;background-size:cover;background-position:center;font-family:${fontFamily};color:var(--text);text-rendering:optimizeLegibility;-webkit-font-smoothing:antialiased}
.hero-card{width:100%;height:100%;position:relative;overflow:hidden;padding:${padTop}px ${padX}px ${padBottom}px}
.hero-vignette{position:absolute;inset:0;background:linear-gradient(to bottom,rgba(0,0,0,.34) 0%,rgba(0,0,0,.08) 40%,rgba(0,0,0,.5) 100%),radial-gradient(circle at 48% 36%,rgba(0,0,0,0) 0%,rgba(0,0,0,.36) 84%);pointer-events:none}
.hero-logo{position:absolute;top:${Math.round(height * 0.03)}px;left:50%;transform:translateX(-50%);font-size:var(--logo-size);font-weight:800;letter-spacing:.01em;color:rgba(255,255,255,.96);text-shadow:0 3px 16px rgba(0,0,0,.35)}
.hero-kicker{position:absolute;top:${Math.round(height * 0.1)}px;left:${padX}px;right:${padX}px;text-align:center;font-size:var(--kicker-size);line-height:1.24;font-weight:760;letter-spacing:-.02em;color:rgba(255,255,255,.98);text-shadow:0 4px 20px rgba(0,0,0,.44)}
.hero-title{position:absolute;top:41%;left:50%;transform:translate(-50%,-50%);width:88%;margin:0;text-align:center;font-size:var(--title-size);line-height:1.12;font-weight:860;letter-spacing:-.04em;color:var(--title);text-shadow:0 10px 28px rgba(0,0,0,.5);text-wrap:balance;word-break:keep-all;line-break:strict}
.hero-callout{position:absolute;width:37%;padding:.5em .6em .56em;border-radius:.34em;background:color-mix(in srgb,var(--panel) 84%,rgba(0,0,0,.42));backdrop-filter:blur(1px);font-size:var(--callout-size);line-height:1.34;font-weight:700;letter-spacing:-.02em;color:#f5fdff;text-shadow:0 3px 14px rgba(0,0,0,.45)}
.hero-left{top:54%;left:${padX}px;text-align:left}
.hero-right{top:63%;right:${padX}px;text-align:left}
.hero-bottom{position:absolute;left:${padX}px;right:${padX}px;bottom:${Math.round(height * 0.04)}px;text-align:center;font-size:var(--bottom-size);line-height:1.28;font-weight:740;letter-spacing:-.02em;color:rgba(255,255,255,.95);text-shadow:0 5px 20px rgba(0,0,0,.5);word-break:keep-all;line-break:strict}
</style></head><body>
<main class="hero-card"><div class="hero-vignette"></div>
${slots.logo ? `<div class="hero-logo fit">${slots.logo}</div>` : ""}
${slots.kicker ? `<div class="hero-kicker fit">${slots.kicker}</div>` : ""}
${slots.center ? `<h1 class="hero-title fit">${slots.center}</h1>` : ""}
${slots.left ? `<div class="hero-callout hero-left fit">${slots.left}</div>` : ""}
${slots.right ? `<div class="hero-callout hero-right fit">${slots.right}</div>` : ""}
${slots.bottom ? `<div class="hero-bottom fit">${slots.bottom}</div>` : ""}
</main>
<script>(()=>{const r=document.documentElement,c=document.querySelector(".hero-card");let t=${titleSize},k=${kickerSize},ca=${calloutSize},b=${bottomSize},l=${logoSize};r.style.setProperty("--title-size",t+"px");r.style.setProperty("--kicker-size",k+"px");r.style.setProperty("--callout-size",ca+"px");r.style.setProperty("--bottom-size",b+"px");r.style.setProperty("--logo-size",l+"px");const o=()=>c.scrollHeight>c.clientHeight+1||c.scrollWidth>c.clientWidth+1;for(let i=0;i<28&&o();i++){t=Math.max(${Math.round(base * 0.048)},Math.round(t*.97));k=Math.max(${Math.round(base * 0.022)},Math.round(k*.97));ca=Math.max(${Math.round(base * 0.022)},Math.round(ca*.97));b=Math.max(${Math.round(base * 0.026)},Math.round(b*.97));l=Math.max(${Math.round(base * 0.02)},Math.round(l*.97));r.style.setProperty("--title-size",t+"px");r.style.setProperty("--kicker-size",k+"px");r.style.setProperty("--callout-size",ca+"px");r.style.setProperty("--bottom-size",b+"px");r.style.setProperty("--logo-size",l+"px")}})()</script>
</body></html>`;
}

function renderCardHtml({ card, width, height, fontFamily, theme }) {
    if (theme.layout === "hero-overlay") {
        return renderHeroOverlayHtml({ card, width, height, fontFamily, theme });
    }

    const base = Math.min(width, height);
    const isPortrait = height >= width;
    const scale = textScaleByLength(card.plainLength);
    const titleSize = Math.round(base * (isPortrait ? theme.titleScalePortrait : theme.titleScaleLandscape) * Math.max(scale, theme.titleScaleFloor));
    const bodySize = Math.round(base * (isPortrait ? theme.bodyScalePortrait : theme.bodyScaleLandscape) * scale);
    const smallSize = Math.round(bodySize * theme.smallTextScale);
    const padX = Math.round(width * theme.padXRatio);
    const padTop = Math.round(height * theme.padTopRatio);
    const padBottom = Math.round(height * theme.padBottomRatio);
    const titleGap = Math.round(base * theme.titleGapRatio);
    const titleMin = Math.round(base * theme.titleMinScale);
    const bodyMin = Math.round(base * theme.bodyMinScale);
    const imageLayer = theme.backgroundImage
        ? `${theme.imageOverlay}, url("${escapeCssUrl(theme.backgroundImage)}"), ` : "";
    const emCss = emphasisCss(theme.emphasisStyle);

    return `<!doctype html><html lang="ko"><head><meta charset="utf-8"/><style>
:root{--bg:${theme.bgColor};--title:${theme.titleColor};--text:${theme.textColor};--muted:${theme.mutedColor};--line:${theme.lineColor};--panel:${theme.panelColor};--panel-strong:${theme.panelStrongColor}}
*{box-sizing:border-box}
body{margin:0;width:${width}px;height:${height}px;background-color:var(--bg);background:${imageLayer}${theme.backgroundLayers},var(--bg);background-repeat:no-repeat;background-size:cover;background-position:center;color:var(--text);font-family:${fontFamily};text-rendering:optimizeLegibility;-webkit-font-smoothing:antialiased}
.card{width:100%;height:100%;padding:${padTop}px ${padX}px ${padBottom}px;display:flex;flex-direction:column;position:relative;overflow:hidden}
h1{margin:0 0 ${titleGap}px;font-size:var(--title-size);line-height:${theme.titleLineHeight};font-weight:${theme.titleWeight};color:var(--title);letter-spacing:${theme.titleLetterSpacing}em;max-width:96%;text-wrap:balance;word-break:keep-all;line-break:strict}
.body{font-size:var(--body-size);line-height:${theme.bodyLineHeight};letter-spacing:${theme.bodyLetterSpacing}em;overflow:hidden;max-width:100%;color:var(--text)}
${emCss}
.body>*:first-child{margin-top:0}.body>*:last-child{margin-bottom:0}
.body h2,.body h3,.body h4,.body h5,.body h6{margin:.2em 0 .55em;line-height:1.28;letter-spacing:-.02em;color:#fff;word-break:keep-all;line-break:strict}
.body h2{font-size:1.18em;font-weight:760}.body h3{font-size:1.1em;font-weight:740}.body h4{font-size:1.02em;font-weight:700}.body h5,.body h6{font-size:.95em;font-weight:680;color:var(--muted)}
.body a{color:var(--title);text-decoration:underline;text-underline-offset:.12em;word-break:break-all}
.body p{margin:0 0 .9em;word-break:keep-all;line-break:strict}
.body blockquote{margin:0 0 .95em;padding:.55em .8em .6em;border-left:.2em solid var(--title);background:linear-gradient(90deg,color-mix(in srgb,var(--title) 16%,transparent) 0%,rgba(255,255,255,.03) 100%);border-radius:.22em;color:#f1f1f1}
.body blockquote p{margin-bottom:.55em}.body p:last-child{margin-bottom:0}
.body ul,.body ol{margin:0 0 .9em;padding-left:1.15em}
.body li{margin-bottom:.42em;word-break:keep-all;line-break:strict}
.body ul li::marker,.body ol li::marker{color:var(--title);font-weight:700}
.body ul.task-list{padding-left:0}.body li.task-list-item{list-style:none;margin-left:0}
.body input[type="checkbox"]{width:.95em;height:.95em;margin-right:.35em;transform:translateY(.08em);accent-color:var(--title)}
.body code{font-size:${smallSize}px;background:var(--panel-strong);border:1px solid var(--line);border-radius:.28em;padding:.08em .28em;font-family:"SFMono-Regular","Menlo","Consolas",monospace}
.body pre{margin:0 0 .95em;padding:.72em .84em;background:rgba(0,0,0,.42);border:1px solid var(--line);border-radius:.38em;overflow:auto}
.body pre code{font-size:.78em;display:block;background:transparent;border:0;padding:0;line-height:1.45;white-space:pre-wrap;word-break:break-word}
.body hr{border:0;border-top:1px solid var(--line);margin:.9em 0 1em}
.body table{width:100%;table-layout:fixed;border-collapse:collapse;margin:0 auto 1em;background:var(--panel);border:1px solid var(--line);border-radius:.4em;overflow:hidden}
.body th,.body td{border:1px solid var(--line);padding:.42em .46em;text-align:center;vertical-align:top;word-break:break-word}
.body th{background:color-mix(in srgb,var(--title) 28%,transparent);color:#fff;font-weight:730}
.body img{display:block;width:100%;max-height:7.2em;object-fit:cover;border-radius:.42em;border:1px solid var(--line);margin:.2em 0 .95em}
.body kbd{font-size:.78em;padding:.06em .3em;border-radius:.28em;border:1px solid var(--line);background:var(--panel-strong)}
</style></head><body>
<main class="card">
${card.title ? `<h1>${card.title}</h1>` : ""}
<section class="body">${card.bodyHtml}</section>
</main>
<script>(()=>{const r=document.documentElement,c=document.querySelector(".card"),t=document.querySelector("h1"),b=document.querySelector(".body");let ct=${titleSize},cb=${bodySize};const mt=${titleMin},mb=${bodyMin};r.style.setProperty("--title-size",ct+"px");r.style.setProperty("--body-size",cb+"px");const o=()=>{if(!c||!b)return false;return c.scrollHeight>c.clientHeight+1||b.scrollHeight>b.clientHeight+1||b.scrollWidth>b.clientWidth+1||(t?t.scrollWidth>t.clientWidth+1:false)};for(let i=0;i<26&&o();i++){ct=Math.max(mt,Math.round(ct*.97));cb=Math.max(mb,Math.round(cb*.975));r.style.setProperty("--title-size",ct+"px");r.style.setProperty("--body-size",cb+"px")}})()</script>
</body></html>`;
}

/**
 * Render markdown to an array of HTML strings (one per card).
 * @param {string} markdown - Raw markdown text
 * @param {object} opts - { preset, ratio, maxChars }
 * @returns {{ cards: string[], presetName: string }}
 */
function renderMarkdownToCards(markdown, opts = {}) {
    const presetName = opts.preset || "reference";
    const preset = PRESETS[presetName];
    if (!preset) throw new Error(`Unknown preset: ${presetName}. Available: ${Object.keys(PRESETS).join(", ")}`);

    const theme = mergeTheme(preset, opts, opts.backgroundImage || "");
    const { ratioW, ratioH } = parseRatio(opts.ratio || "4:5");
    const { width, height } = resolveDimensions({ ratioW, ratioH });
    const maxChars = Number(opts.maxChars) || 260;

    const explicit = splitByExplicitDivider(markdown);
    const rawCards = explicit.length > 1 ? explicit : autoSplitMarkdown(markdown, maxChars);
    if (!rawCards.length) return { cards: [], width, height };

    const cards = rawCards.map(parseCard);
    const htmlCards = cards.map((card) => {
        const cardBgImage = card.directives["bg-image"] || "";
        const cardTheme = cardBgImage
            ? { ...theme, backgroundImage: cardBgImage }
            : theme;
        return renderCardHtml({ card, width, height, fontFamily: cardTheme.fontFamily, theme: cardTheme });
    });

    return { cards: htmlCards, width, height, presetName };
}

module.exports = {
    PRESETS,
    renderMarkdownToCards,
    splitByExplicitDivider,
    autoSplitMarkdown,
    parseCard,
    extractCardDirectives,
    mergeTheme,
    renderCardHtml,
    parseRatio,
    resolveDimensions,
    stripMarkdown,
};
