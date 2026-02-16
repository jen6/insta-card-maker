const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");

(async () => {
    const svgPath = path.resolve(__dirname, "../web/public/og-image.svg");
    const outPath = path.resolve(__dirname, "../web/public/og-image.png");
    const svgContent = fs.readFileSync(svgPath, "utf-8");

    const html = `<!DOCTYPE html><html><head><style>body{margin:0;padding:0;}</style></head><body>${svgContent}</body></html>`;

    const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox"] });
    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 630 });
    await page.setContent(html, { waitUntil: "networkidle0" });
    await page.screenshot({ path: outPath, type: "png", clip: { x: 0, y: 0, width: 1200, height: 630 } });
    await browser.close();
    console.log("OG image saved to", outPath);
})();
