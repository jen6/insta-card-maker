const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");

(async () => {
  const card1 = fs.readFileSync(path.resolve(__dirname, "og-cards/card1/01.png"));
  const card2 = fs.readFileSync(path.resolve(__dirname, "og-cards/card2/01.png"));
  const card1b64 = `data:image/png;base64,${card1.toString("base64")}`;
  const card2b64 = `data:image/png;base64,${card2.toString("base64")}`;

  const html = `<!DOCTYPE html>
<html><head><style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  width: 1200px; height: 630px;
  background: #fafafa;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  position: relative;
  padding: 0 80px;
}
body::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 3px;
  background: #222;
}
.inner {
  display: flex;
  align-items: center;
  width: 100%;
  gap: 40px;
}
.left {
  flex: 0 0 460px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 12px;
}
.sparkle svg { width: 44px; height: 44px; }
h1 {
  font-size: 80px;
  font-weight: 800;
  color: #111;
  letter-spacing: -1.5px;
  line-height: 1.02;
}
.sub {
  font-size: 32px;
  color: #444;
  font-weight: 400;
  line-height: 1.3;
  margin-top: 8px;
}
.tags {
  display: flex;
  gap: 12px;
  margin-top: 12px;
}
.tag {
  padding: 10px 24px;
  border-radius: 22px;
  background: rgba(34,34,34,0.07);
  font-size: 19px;
  color: #333;
  font-weight: 500;
}
.right {
  flex: 1;
  position: relative;
  height: 500px;
}
.card {
  position: absolute;
  border-radius: 14px;
  overflow: hidden;
  box-shadow: 0 8px 32px rgba(0,0,0,0.15);
  border: 1px solid #e0e0e0;
}
.card img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.card-1 {
  width: 300px;
  height: 375px;
  z-index: 2;
  left: 0;
  top: 50%;
  transform: translateY(-50%) rotate(-3deg);
}
.card-2 {
  width: 300px;
  height: 375px;
  z-index: 1;
  left: 200px;
  top: 50%;
  transform: translateY(-50%) rotate(2deg);
}
</style></head>
<body>
  <div class="inner">
    <div class="left">
      <div class="sparkle">
        <svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M14 0L17 10.5L28 14L17 17.5L14 28L11 17.5L0 14L11 10.5Z" fill="#222"/>
          <path d="M26 0L27.3 4.5L32 5.5L27.3 6.5L26 11L24.7 6.5L20 5.5L24.7 4.5Z" fill="#222" opacity="0.45"/>
        </svg>
      </div>
      <h1>Insta Card<br/>Maker</h1>
      <p class="sub">글만 쓰면 됩니다. 진짜로.</p>
      <div class="tags">
        <span class="tag">Markdown</span>
        <span class="tag">Card News</span>
      </div>
    </div>
    <div class="right">
      <div class="card card-1"><img src="${card1b64}" /></div>
      <div class="card card-2"><img src="${card2b64}" /></div>
    </div>
  </div>
</body></html>`;

  const outPath = path.resolve(__dirname, "../web/public/og-image.png");
  const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox"] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 630, deviceScaleFactor: 2 });
  await page.setContent(html, { waitUntil: "networkidle0" });
  await page.screenshot({
    path: outPath,
    type: "png",
    clip: { x: 0, y: 0, width: 1200, height: 630 },
  });
  await browser.close();
  console.log("OG image saved to", outPath);
})();
