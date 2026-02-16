export const PREVIEW_SCALE_DEFAULT = 0.305;
export const PREVIEW_SCALE_COLLAPSED = 0.545;
export const SIDEBAR_STATE_KEY = "instaCard.sidebarCollapsed";
export const FIRST_VISIT_KEY = "instaCard.firstVisitDone";
export const EDITOR_MODE_KEY = "instaCard.editorMode";
export const MD_DATA_IMAGE_RE = /!\[([^\]]*)\]\(\s*(data:image\/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+/=]+)\s*\)/g;
export const MD_INLINE_REF_RE = /!\[([^\]]*)\]\(\s*(cid:img-\d+)\s*\)/g;
export const RATIO_OPTIONS = ["4:5", "1:1", "3:4", "4:3"];
export const DEFAULT_STYLE_TABS = ["reference", "modern", "minimal"];

export const EXAMPLE_MARKDOWN = `---

# 📸 Insta Card Maker 사용법

마크다운으로 글을 쓰면 자동으로 카드뉴스가 만들어집니다.

지금 보고 있는 이 카드가 바로 예시입니다.

---

# ✍️ 기본 작성법

**제목**은 \`# 제목\`으로 작성합니다.

**굵은 글씨**는 \`**텍스트**\`로 감싸세요.

줄바꿈은 빈 줄 하나로 구분합니다.

---

# ✂️ 슬라이드 나누기

카드를 나누려면 \`---\` 구분선을 사용하세요.

구분선 위아래로 빈 줄을 넣으면 됩니다.

이렇게 하면 자동으로 다음 카드로 넘어갑니다.

---
<!-- bg-image: https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1080&q=80 -->

# 🖼️ 배경 이미지 넣기

이 카드에는 배경 이미지가 적용되어 있습니다.

슬라이드 상단에 bg-image 디렉티브를 넣으면 해당 카드에만 배경이 적용됩니다.

형식: &lt;!-- bg-image: 이미지URL --&gt;

---

# 📋 이미지 붙여넣기

클립보드에 복사한 이미지를 에디터에 바로 **Ctrl+V** (Mac: **Cmd+V**)로 붙여넣을 수 있습니다.

웹에서 이미지를 복사하거나 스크린샷을 찍은 뒤 바로 붙여넣어 보세요.

---

# 🎨 스타일 & 비율

상단 **Styles** 탭에서 디자인을 변경할 수 있습니다.

오른쪽 상단에서 **비율**(4:5, 1:1 등)도 선택 가능합니다.

---

# 💾 저장 & 내보내기

- **Save** 버튼으로 브라우저에 저장
- **Export** 버튼으로 PNG 이미지 다운로드
- **Library**에서 저장된 글 관리

---
<!-- bg-image: https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1080&q=80 -->

# 🚀 지금 시작해보세요!

왼쪽 에디터의 내용을 지우고 자유롭게 작성해보세요.

**New Slide** 버튼을 눌러 새 글을 시작할 수 있습니다.

즐거운 카드뉴스 만들기 되세요! 🎉`;

export function formatPresetLabel(name) {
    return String(name || "")
        .split("-")
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
}

export function formatDate(isoText) {
    const date = new Date(isoText);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleString("ko-KR", {
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    });
}

export function formatRelative(isoText) {
    const date = new Date(isoText);
    const time = date.getTime();
    if (Number.isNaN(time)) return "Updated recently";

    const delta = Date.now() - time;
    const minute = 60 * 1000;
    const hour = 60 * minute;
    const day = 24 * hour;

    if (delta < hour) {
        const mins = Math.max(1, Math.floor(delta / minute));
        return `Updated ${mins}m ago`;
    }
    if (delta < day) {
        const hours = Math.max(1, Math.floor(delta / hour));
        return `Updated ${hours}h ago`;
    }
    if (delta < 2 * day) return "Updated Yesterday";
    return `Updated ${formatDate(isoText)}`;
}

export function getInitialSidebarState() {
    try {
        return localStorage.getItem(SIDEBAR_STATE_KEY) === "1";
    } catch (_err) {
        return false;
    }
}
