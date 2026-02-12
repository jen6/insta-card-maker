const express = require("express");
const path = require("path");
const { renderMarkdownToCards, PRESETS } = require("./renderer");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "2mb" }));
app.use(express.static(path.join(__dirname, "public")));

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

// Render markdown -> array of HTML card strings
app.post("/api/render", (req, res) => {
    try {
        const { markdown, preset, ratio, maxChars } = req.body;
        if (!markdown || !markdown.trim()) {
            return res.json({ cards: [], width: 1080, height: 1350 });
        }
        const result = renderMarkdownToCards(markdown, { preset, ratio, maxChars });
        res.json(result);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

app.listen(PORT, () => {
    console.log(`Card preview server running at http://localhost:${PORT}`);
});
