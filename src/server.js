const express = require("express");
const path = require("path");
const { existsSync } = require("fs");
const fs = require("fs/promises");
const { randomUUID, createHash } = require("crypto");
const Database = require("better-sqlite3");
const { renderMarkdownToCards, PRESETS } = require("./renderer");

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, "..", "data");
const POSTS_JSON_FILE = path.join(DATA_DIR, "posts.json");
const DB_FILE = path.join(DATA_DIR, "content.db");
const FRONTEND_DIST_DIR = path.join(__dirname, "..", "web", "dist");
const LEGACY_PUBLIC_DIR = path.join(__dirname, "public");

const MD_DATA_IMAGE_RE = /!\[([^\]]*)\]\(\s*(data:image\/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+/=]+)\s*\)/g;
const MD_ASSET_REF_RE = /!\[([^\]]*)\]\(\s*asset:\/\/([a-zA-Z0-9-]+)\s*\)/g;
const DATA_URL_RE = /^data:(image\/[a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=]+)$/;
const ASSET_ID_RE = /asset:\/\/([a-zA-Z0-9-]+)/g;

let db;
let stmts;

app.use(express.json({ limit: "8mb" }));
if (existsSync(FRONTEND_DIST_DIR)) {
    app.use(express.static(FRONTEND_DIST_DIR));
}
app.use(express.static(LEGACY_PUBLIC_DIR));

function firstHeading(markdown) {
    const matched = String(markdown || "").match(/^\s*#\s+(.+)$/m);
    return matched ? matched[1].trim() : "";
}

function normalizePostInput(payload) {
    const markdown = String(payload.markdown || "");
    const title = String(payload.title || "").trim();
    const preset = String(payload.preset || "reference");
    const ratio = String(payload.ratio || "4:5");
    const backgroundImage = String(payload.backgroundImage || "").trim();
    const resolvedTitle = title || firstHeading(markdown) || "제목 없음";

    if (!markdown.trim()) throw new Error("게시물 본문(markdown)은 비워둘 수 없습니다.");
    if (!PRESETS[preset]) throw new Error(`유효하지 않은 preset: ${preset}`);
    if (!/^\d+(?:\.\d+)?:\d+(?:\.\d+)?$/.test(ratio)) throw new Error(`유효하지 않은 ratio: ${ratio}`);

    return {
        title: resolvedTitle,
        markdown,
        preset,
        ratio,
        backgroundImage,
    };
}

function decodeDataUrlImage(dataUrl) {
    const matched = DATA_URL_RE.exec(String(dataUrl || "").trim());
    if (!matched) return null;
    const mimeType = matched[1];
    const base64Data = matched[2];
    const binary = Buffer.from(base64Data, "base64");
    if (!binary.length) return null;
    return { mimeType, binary };
}

function findOrCreateAssetId(dataUrl) {
    const parsed = decodeDataUrlImage(dataUrl);
    if (!parsed) return null;
    const sha256 = createHash("sha256").update(parsed.binary).digest("hex");
    const existing = stmts.findAssetByHash.get(sha256);
    if (existing) return existing.id;
    const id = randomUUID();
    const now = new Date().toISOString();
    stmts.insertAsset.run(id, parsed.mimeType, parsed.binary, sha256, now);
    return id;
}

function persistInlineImages(markdown) {
    return String(markdown || "").replace(MD_DATA_IMAGE_RE, (match, alt, dataUrl) => {
        const assetId = findOrCreateAssetId(dataUrl);
        if (!assetId) return match;
        return `![${alt || "image"}](asset://${assetId})`;
    });
}

function extractAssetIds(markdown) {
    return [...new Set([...String(markdown || "").matchAll(ASSET_ID_RE)].map((entry) => entry[1]))];
}

function removeUnusedAssets(assetIds) {
    for (const assetId of assetIds) {
        const used = stmts.findAnyPostUsingAsset.get(`%asset://${assetId}%`);
        if (!used) stmts.deleteAssetById.run(assetId);
    }
}

function readAssetRowsByIds(assetIds) {
    if (!assetIds.length) return new Map();
    const placeholders = assetIds.map(() => "?").join(", ");
    const rows = db.prepare(`SELECT id, mime_type AS mimeType, data FROM assets WHERE id IN (${placeholders})`).all(...assetIds);
    return new Map(rows.map((row) => [row.id, row]));
}

function restoreInlineImages(markdown) {
    const refs = [...String(markdown || "").matchAll(MD_ASSET_REF_RE)];
    if (!refs.length) return String(markdown || "");
    const ids = [...new Set(refs.map((entry) => entry[2]))];
    const assets = readAssetRowsByIds(ids);
    return String(markdown || "").replace(MD_ASSET_REF_RE, (match, alt, id) => {
        const asset = assets.get(id);
        if (!asset) return match;
        return `![${alt || "image"}](data:${asset.mimeType};base64,${asset.data.toString("base64")})`;
    });
}

function summarizePost(postRow) {
    return {
        id: postRow.id,
        title: postRow.title,
        preset: postRow.preset,
        ratio: postRow.ratio,
        createdAt: postRow.createdAt,
        updatedAt: postRow.updatedAt,
    };
}

function buildPostResponse(postRow) {
    if (!postRow) return null;
    return {
        id: postRow.id,
        title: postRow.title,
        markdown: restoreInlineImages(postRow.markdown),
        preset: postRow.preset,
        ratio: postRow.ratio,
        backgroundImage: postRow.backgroundImage,
        createdAt: postRow.createdAt,
        updatedAt: postRow.updatedAt,
    };
}

function initDatabase() {
    db = new Database(DB_FILE);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");

    db.exec(`
        CREATE TABLE IF NOT EXISTS assets (
            id TEXT PRIMARY KEY,
            mime_type TEXT NOT NULL,
            data BLOB NOT NULL,
            sha256 TEXT NOT NULL UNIQUE,
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS posts (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            markdown TEXT NOT NULL,
            preset TEXT NOT NULL,
            ratio TEXT NOT NULL,
            background_image TEXT NOT NULL DEFAULT '',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_posts_updated_at ON posts(updated_at DESC);
    `);

    stmts = {
        findAssetByHash: db.prepare("SELECT id FROM assets WHERE sha256 = ?"),
        insertAsset: db.prepare("INSERT INTO assets (id, mime_type, data, sha256, created_at) VALUES (?, ?, ?, ?, ?)"),
        findAnyPostUsingAsset: db.prepare("SELECT 1 FROM posts WHERE markdown LIKE ? LIMIT 1"),
        deleteAssetById: db.prepare("DELETE FROM assets WHERE id = ?"),
        listPosts: db.prepare(`
            SELECT
                id,
                title,
                preset,
                ratio,
                created_at AS createdAt,
                updated_at AS updatedAt
            FROM posts
            ORDER BY datetime(updated_at) DESC
        `),
        getPostById: db.prepare(`
            SELECT
                id,
                title,
                markdown,
                preset,
                ratio,
                background_image AS backgroundImage,
                created_at AS createdAt,
                updated_at AS updatedAt
            FROM posts
            WHERE id = ?
        `),
        insertPost: db.prepare(`
            INSERT INTO posts (id, title, markdown, preset, ratio, background_image, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `),
        updatePost: db.prepare(`
            UPDATE posts
            SET title = ?, markdown = ?, preset = ?, ratio = ?, background_image = ?, updated_at = ?
            WHERE id = ?
        `),
        deletePost: db.prepare("DELETE FROM posts WHERE id = ?"),
        postCount: db.prepare("SELECT COUNT(*) AS count FROM posts"),
    };
}

async function migrateFromJsonIfNeeded() {
    const row = stmts.postCount.get();
    const postCount = row ? row.count : 0;
    if (postCount > 0) return;
    try {
        const raw = await fs.readFile(POSTS_JSON_FILE, "utf8");
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed) || !parsed.length) return;
        const insertMany = db.transaction((entries) => {
            for (const entry of entries) {
                try {
                    const input = normalizePostInput(entry);
                    const markdownWithAssets = persistInlineImages(input.markdown);
                    const id = String(entry.id || randomUUID());
                    const createdAt = String(entry.createdAt || new Date().toISOString());
                    const updatedAt = String(entry.updatedAt || createdAt);
                    stmts.insertPost.run(
                        id,
                        input.title,
                        markdownWithAssets,
                        input.preset,
                        input.ratio,
                        input.backgroundImage,
                        createdAt,
                        updatedAt
                    );
                } catch (err) {
                    console.warn("Skip invalid post during JSON migration:", err.message);
                }
            }
        });
        insertMany(parsed);
    } catch (err) {
        if (err.code === "ENOENT") return;
        throw err;
    }
}

async function bootstrap() {
    await fs.mkdir(DATA_DIR, { recursive: true });
    initDatabase();
    await migrateFromJsonIfNeeded();
}

// Return available presets
app.get("/api/presets", (_req, res) => {
    const list = Object.entries(PRESETS).map(([name, p]) => ({
        name,
        description: p.description,
        titleColor: p.titleColor,
        bgColor: p.bgColor,
    }));
    res.json(list);
});

// List saved posts (newest first)
app.get("/api/posts", (_req, res) => {
    try {
        const posts = stmts.listPosts.all().map(summarizePost);
        res.json(posts);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Read one saved post
app.get("/api/posts/:id", (req, res) => {
    try {
        const row = stmts.getPostById.get(req.params.id);
        const post = buildPostResponse(row);
        if (!post) return res.status(404).json({ error: "게시물을 찾을 수 없습니다." });
        res.json(post);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create a new post
app.post("/api/posts", (req, res) => {
    try {
        const input = normalizePostInput(req.body || {});
        const now = new Date().toISOString();
        const id = randomUUID();
        const markdownWithAssets = persistInlineImages(input.markdown);
        stmts.insertPost.run(
            id,
            input.title,
            markdownWithAssets,
            input.preset,
            input.ratio,
            input.backgroundImage,
            now,
            now
        );
        const created = buildPostResponse(stmts.getPostById.get(id));
        res.status(201).json(created);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Update an existing post
app.put("/api/posts/:id", (req, res) => {
    try {
        const input = normalizePostInput(req.body || {});
        const existing = stmts.getPostById.get(req.params.id);
        if (!existing) return res.status(404).json({ error: "게시물을 찾을 수 없습니다." });
        const now = new Date().toISOString();
        const markdownWithAssets = persistInlineImages(input.markdown);
        stmts.updatePost.run(
            input.title,
            markdownWithAssets,
            input.preset,
            input.ratio,
            input.backgroundImage,
            now,
            req.params.id
        );
        const beforeAssetIds = extractAssetIds(existing.markdown);
        const afterAssetIds = new Set(extractAssetIds(markdownWithAssets));
        const removedAssetIds = beforeAssetIds.filter((assetId) => !afterAssetIds.has(assetId));
        removeUnusedAssets(removedAssetIds);
        const updated = buildPostResponse(stmts.getPostById.get(req.params.id));
        res.json(updated);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Delete a saved post
app.delete("/api/posts/:id", (req, res) => {
    try {
        const existing = stmts.getPostById.get(req.params.id);
        if (!existing) return res.status(404).json({ error: "게시물을 찾을 수 없습니다." });
        const assetIds = extractAssetIds(existing.markdown);
        const result = stmts.deletePost.run(req.params.id);
        if (!result.changes) return res.status(404).json({ error: "게시물을 찾을 수 없습니다." });
        removeUnusedAssets(assetIds);
        res.status(204).end();
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Render markdown -> array of HTML card strings
app.post("/api/render", (req, res) => {
    try {
        const { markdown, preset, ratio, maxChars, backgroundImage } = req.body;
        if (!markdown || !markdown.trim()) {
            return res.json({ cards: [], width: 1080, height: 1350 });
        }
        const result = renderMarkdownToCards(markdown, { preset, ratio, maxChars, backgroundImage });
        res.json(result);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

bootstrap()
    .then(() => {
        app.listen(PORT, () => {
            console.log(`Card preview server running at http://localhost:${PORT}`);
        });
    })
    .catch((err) => {
        console.error("Failed to start server:", err);
        process.exit(1);
    });
