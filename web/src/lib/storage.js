/**
 * localStorage-based post storage (replaces server-side SQLite).
 */

const STORAGE_KEY = "instaCard.posts";

function generateId() {
    return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function readAll() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

function writeAll(posts) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(posts));
}

export function listPosts() {
    return readAll()
        .map(({ id, title, preset, ratio, createdAt, updatedAt }) => ({
            id, title, preset, ratio, createdAt, updatedAt,
        }))
        .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
}

export function getPost(id) {
    return readAll().find((p) => p.id === id) || null;
}

export function createPost({ title, markdown, preset, ratio, backgroundImage }) {
    const posts = readAll();
    const now = new Date().toISOString();
    const post = {
        id: generateId(),
        title: title || firstHeading(markdown) || "제목 없음",
        markdown,
        preset: preset || "reference",
        ratio: ratio || "4:5",
        backgroundImage: backgroundImage || "",
        createdAt: now,
        updatedAt: now,
    };
    posts.push(post);
    writeAll(posts);
    return post;
}

export function updatePost(id, { title, markdown, preset, ratio, backgroundImage }) {
    const posts = readAll();
    const idx = posts.findIndex((p) => p.id === id);
    if (idx === -1) return null;
    const now = new Date().toISOString();
    posts[idx] = {
        ...posts[idx],
        title: title || firstHeading(markdown) || "제목 없음",
        markdown,
        preset: preset || "reference",
        ratio: ratio || "4:5",
        backgroundImage: backgroundImage || "",
        updatedAt: now,
    };
    writeAll(posts);
    return posts[idx];
}

export function deletePost(id) {
    const posts = readAll();
    const filtered = posts.filter((p) => p.id !== id);
    if (filtered.length === posts.length) return false;
    writeAll(filtered);
    return true;
}

function firstHeading(markdown) {
    const m = String(markdown || "").match(/^\s*#\s+(.+)$/m);
    return m ? m[1].trim() : "";
}
