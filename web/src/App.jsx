import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Grid2x2, LayoutList, Menu, Plus, Save, Sparkles, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

const PREVIEW_SCALE_DEFAULT = 0.305;
const PREVIEW_SCALE_COLLAPSED = 0.545;
const SIDEBAR_STATE_KEY = "instaCard.sidebarCollapsed";
const MD_DATA_IMAGE_RE = /!\[([^\]]*)\]\(\s*(data:image\/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+/=]+)\s*\)/g;
const MD_INLINE_REF_RE = /!\[([^\]]*)\]\(\s*(cid:img-\d+)\s*\)/g;
const RATIO_OPTIONS = ["4:5", "1:1", "3:4", "4:3"];
const DEFAULT_STYLE_TABS = ["reference", "modern", "minimal"];

function formatPresetLabel(name) {
  return String(name || "")
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatDate(isoText) {
  const date = new Date(isoText);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatRelative(isoText) {
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

function getInitialSidebarState() {
  try {
    return localStorage.getItem(SIDEBAR_STATE_KEY) === "1";
  } catch (_err) {
    return false;
  }
}

export default function App() {
  const [presets, setPresets] = useState([]);
  const [savedPosts, setSavedPosts] = useState([]);
  const [currentPostId, setCurrentPostId] = useState(null);
  const [postTitle, setPostTitle] = useState("");
  const [markdown, setMarkdown] = useState("");
  const [preset, setPreset] = useState("reference");
  const [ratio, setRatio] = useState("4:5");
  const [bgImage, setBgImage] = useState("");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(getInitialSidebarState);
  const [status, setStatus] = useState({ message: "", isError: false });
  const [previewState, setPreviewState] = useState({
    loading: false,
    error: "",
    width: 1080,
    height: 1350,
  });
  const [previewFrames, setPreviewFrames] = useState([]);

  const statusTimerRef = useRef(null);
  const inlineImageSeqRef = useRef(0);
  const inlineImagesRef = useRef(new Map());
  const renderRequestRef = useRef(0);
  const activePreviewUrlsRef = useRef([]);
  const markdownRef = useRef(null);

  const previewScale = sidebarCollapsed ? PREVIEW_SCALE_COLLAPSED : PREVIEW_SCALE_DEFAULT;
  const scaledW = useMemo(() => Math.round(previewState.width * previewScale), [previewScale, previewState.width]);
  const scaledH = useMemo(() => Math.round(previewState.height * previewScale), [previewScale, previewState.height]);

  const styleTabs = useMemo(() => {
    const names = presets.map((item) => item.name).filter(Boolean);
    const source = names.length ? names : DEFAULT_STYLE_TABS;
    return source.map((value) => ({
      value,
      label: formatPresetLabel(value),
    }));
  }, [presets]);

  const clearPreviewUrls = useCallback((urls) => {
    const targetUrls = urls || activePreviewUrlsRef.current;
    targetUrls.forEach((url) => URL.revokeObjectURL(url));
    if (!urls) activePreviewUrlsRef.current = [];
  }, []);

  const showStatus = useCallback((message, isError = false) => {
    setStatus({ message: String(message || ""), isError });
    if (!message) return;
    clearTimeout(statusTimerRef.current);
    statusTimerRef.current = setTimeout(() => {
      setStatus((prev) => (prev.message === message ? { message: "", isError: false } : prev));
    }, 2400);
  }, []);

  const makeInlineImageRef = useCallback((dataUrl) => {
    inlineImageSeqRef.current += 1;
    const ref = `cid:img-${inlineImageSeqRef.current}`;
    inlineImagesRef.current.set(ref, dataUrl);
    return ref;
  }, []);

  const expandInlineImageRefs = useCallback((md) => {
    return String(md || "").replace(MD_INLINE_REF_RE, (match, alt, ref) => {
      const dataUrl = inlineImagesRef.current.get(ref);
      if (!dataUrl) return match;
      return `![${alt || "image"}](${dataUrl})`;
    });
  }, []);

  const compactDataImageRefs = useCallback(
    (md) =>
      String(md || "").replace(MD_DATA_IMAGE_RE, (_match, alt, dataUrl) => {
        const ref = makeInlineImageRef(dataUrl);
        return `![${alt || "image"}](${ref})`;
      }),
    [makeInlineImageRef]
  );

  const loadPresets = useCallback(async () => {
    const res = await fetch("/api/presets");
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "프리셋 목록을 불러오지 못했습니다.");
    const list = Array.isArray(data) ? data : [];
    setPresets(list);
    setPreset((current) => {
      if (list.some((item) => item.name === current)) return current;
      if (list.some((item) => item.name === "reference")) return "reference";
      return list[0]?.name || current;
    });
  }, []);

  const loadPostList = useCallback(async () => {
    const res = await fetch("/api/posts");
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "게시물 목록을 불러오지 못했습니다.");
    setSavedPosts(Array.isArray(data) ? data : []);
  }, []);

  const loadPost = useCallback(
    async (postId) => {
      const res = await fetch(`/api/posts/${encodeURIComponent(postId)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "게시물을 불러오지 못했습니다.");

      setCurrentPostId(data.id);
      setPostTitle(data.title || "");
      setMarkdown(compactDataImageRefs(String(data.markdown || "")));
      setPreset(data.preset || "reference");
      setRatio(data.ratio || "4:5");
      setBgImage(data.backgroundImage || "");
      showStatus("게시물을 불러왔습니다.");
    },
    [compactDataImageRefs, showStatus]
  );

  const resetToNewPost = useCallback(() => {
    setCurrentPostId(null);
    setPostTitle("");
    setMarkdown("");
    setBgImage("");
    showStatus("새 게시물 작성 모드");
  }, [showStatus]);

  const renderPreview = useCallback(async () => {
    const currentMarkdown = markdown.trim();
    if (!currentMarkdown) {
      clearPreviewUrls();
      setPreviewFrames([]);
      setPreviewState({ loading: false, error: "", width: 1080, height: 1350 });
      return;
    }

    const requestId = renderRequestRef.current + 1;
    renderRequestRef.current = requestId;
    setPreviewState((prev) => ({ ...prev, loading: true, error: "" }));

    try {
      const res = await fetch("/api/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          markdown: expandInlineImageRefs(markdown),
          preset,
          ratio,
          backgroundImage: bgImage.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (renderRequestRef.current !== requestId) return;
      if (!res.ok || data.error) throw new Error(data.error || "카드 렌더링 실패");

      const cards = Array.isArray(data.cards) ? data.cards : [];
      if (!cards.length) {
        clearPreviewUrls();
        setPreviewFrames([]);
        setPreviewState({ loading: false, error: "", width: data.width || 1080, height: data.height || 1350 });
        return;
      }

      const frames = cards.map((html, index) => {
        const blob = new Blob([html], { type: "text/html" });
        const url = URL.createObjectURL(blob);
        return {
          key: `${requestId}-${index}`,
          index: index + 1,
          total: cards.length,
          url,
        };
      });

      clearPreviewUrls();
      activePreviewUrlsRef.current = frames.map((frame) => frame.url);
      setPreviewFrames(frames);
      setPreviewState({
        loading: false,
        error: "",
        width: data.width || 1080,
        height: data.height || 1350,
      });
    } catch (err) {
      if (renderRequestRef.current !== requestId) return;
      clearPreviewUrls();
      setPreviewFrames([]);
      setPreviewState({ loading: false, error: err.message, width: 1080, height: 1350 });
    }
  }, [bgImage, clearPreviewUrls, expandInlineImageRefs, markdown, preset, ratio]);

  const savePost = useCallback(async () => {
    const payload = {
      title: postTitle.trim(),
      markdown: expandInlineImageRefs(markdown),
      preset,
      ratio,
      backgroundImage: bgImage.trim(),
    };

    if (!payload.markdown.trim()) {
      showStatus("본문(markdown)을 입력해 주세요.", true);
      return;
    }

    const isUpdate = Boolean(currentPostId);
    const endpoint = isUpdate ? `/api/posts/${encodeURIComponent(currentPostId)}` : "/api/posts";
    const method = isUpdate ? "PUT" : "POST";

    const res = await fetch(endpoint, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "게시물 저장 실패");

    setCurrentPostId(data.id);
    if (data.title) setPostTitle(data.title);
    await loadPostList();
    showStatus(isUpdate ? "게시물을 수정했습니다." : "게시물을 저장했습니다.");
  }, [bgImage, currentPostId, expandInlineImageRefs, loadPostList, markdown, postTitle, preset, ratio, showStatus]);

  const deletePost = useCallback(async () => {
    if (!currentPostId) return;
    if (!window.confirm("현재 게시물을 삭제할까요?")) return;

    const res = await fetch(`/api/posts/${encodeURIComponent(currentPostId)}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "게시물 삭제 실패");
    }

    setCurrentPostId(null);
    setPostTitle("");
    setMarkdown("");
    setBgImage("");
    await loadPostList();
    showStatus("게시물을 삭제했습니다.");
  }, [currentPostId, loadPostList, showStatus]);

  const insertAtCursor = useCallback((text, start, end) => {
    setMarkdown((prev) => `${prev.slice(0, start)}${text}${prev.slice(end)}`);
    requestAnimationFrame(() => {
      const nextCursor = start + text.length;
      if (markdownRef.current) {
        markdownRef.current.selectionStart = nextCursor;
        markdownRef.current.selectionEnd = nextCursor;
        markdownRef.current.focus();
      }
    });
  }, []);

  const handlePaste = useCallback(
    (event) => {
      const items = event.clipboardData?.items;
      if (items) {
        for (const item of items) {
          if (!item.type.startsWith("image/")) continue;
          event.preventDefault();
          const file = item.getAsFile();
          if (!file) return;
          const target = event.target;
          const start = target.selectionStart;
          const end = target.selectionEnd;
          const reader = new FileReader();
          reader.onload = () => {
            const dataUrl = String(reader.result || "");
            const ref = makeInlineImageRef(dataUrl);
            insertAtCursor(`![image](${ref})`, start, end);
          };
          reader.readAsDataURL(file);
          return;
        }
      }

      const pastedText = event.clipboardData?.getData("text") || "";
      if (!pastedText.includes("data:image/")) return;
      event.preventDefault();
      const target = event.target;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      insertAtCursor(compactDataImageRefs(pastedText), start, end);
    },
    [compactDataImageRefs, insertAtCursor, makeInlineImageRef]
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      renderPreview().catch((err) => {
        showStatus(err.message, true);
      });
    }, 400);
    return () => clearTimeout(timer);
  }, [renderPreview, showStatus]);

  useEffect(() => {
    Promise.all([loadPresets(), loadPostList()]).catch((err) => {
      showStatus(err.message, true);
    });
  }, [loadPostList, loadPresets, showStatus]);

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_STATE_KEY, sidebarCollapsed ? "1" : "0");
    } catch (_err) {
      // no-op
    }
  }, [sidebarCollapsed]);

  useEffect(() => {
    return () => {
      clearTimeout(statusTimerRef.current);
      clearPreviewUrls();
    };
  }, [clearPreviewUrls]);

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-left">
          <button
            type="button"
            className="icon-button"
            onClick={() => setSidebarCollapsed((prev) => !prev)}
            aria-expanded={!sidebarCollapsed}
            aria-label={sidebarCollapsed ? "라이브러리 열기" : "라이브러리 닫기"}
          >
            <Menu size={17} />
          </button>
          <button type="button" className="icon-button is-dark" aria-label="스타일 메뉴">
            <Sparkles size={15} />
          </button>
          <div className="brand-row">
            <p className="brand-title">Insta Card Maker</p>
            <p className="brand-meta">v2.0 Beta</p>
          </div>
        </div>

        <div className="topbar-center">
          <span className="toolbar-label">Styles</span>
          <div className="style-tabs">
            {styleTabs.map((tab) => (
              <button
                key={tab.value}
                type="button"
                className={cn("style-tab", tab.value === preset && "is-active")}
                onClick={() => setPreset(tab.value)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="topbar-right">
          <label className="ratio-select-wrap">
            <span className="sr-only">비율 선택</span>
            <select value={ratio} onChange={(event) => setRatio(event.target.value)} className="ratio-select">
              {RATIO_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option} Instagram Portrait
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="primary-cta"
            onClick={() => {
              savePost().catch((err) => showStatus(err.message, true));
            }}
          >
            Export
          </button>
        </div>
      </header>

      <main className={cn("workspace-grid", sidebarCollapsed && "is-sidebar-collapsed")}>
        <aside className={cn("library-pane", sidebarCollapsed && "is-collapsed")}>
          <div className="pane-header">
            <p>Library</p>
            <button type="button" className="link-btn" onClick={resetToNewPost}>
              <Plus size={14} />
            </button>
          </div>

          <div className="library-list">
            {!savedPosts.length && <p className="empty-hint">저장된 게시물이 없습니다.</p>}
            {savedPosts.map((post) => {
              const active = post.id === currentPostId;
              return (
                <button
                  key={post.id}
                  type="button"
                  className={cn("library-item", active && "is-active")}
                  onClick={() => {
                    loadPost(post.id).catch((err) => showStatus(err.message, true));
                  }}
                >
                  <p className="library-item-title">{post.title || "제목 없음"}</p>
                  <p className="library-item-meta">{formatRelative(post.updatedAt)}</p>
                </button>
              );
            })}
          </div>
        </aside>

        <section className="editor-pane">
          <div className="editor-title-row">
            <input
              className="editor-title-input"
              value={postTitle}
              onChange={(event) => setPostTitle(event.target.value)}
              placeholder="AI시대에 엔지니어는 '취향'을 탑니다"
            />
            <div className="editor-tools" aria-hidden="true">
              <span>B</span>
              <span>I</span>
              <span>↗</span>
              <span>◫</span>
            </div>
          </div>

          <div className="editor-action-row">
            <button
              type="button"
              className="action-btn dark"
              onClick={() => {
                savePost().catch((err) => showStatus(err.message, true));
              }}
            >
              <Save size={14} /> Save
            </button>
            <button type="button" className="action-btn" onClick={resetToNewPost}>
              <Plus size={14} /> New Slide
            </button>
            <button
              type="button"
              className="action-btn"
              disabled={!currentPostId}
              onClick={() => {
                deletePost().catch((err) => showStatus(err.message, true));
              }}
            >
              <Trash2 size={14} /> Delete
            </button>
          </div>

          <textarea
            ref={markdownRef}
            className="editor-textarea"
            value={markdown}
            onChange={(event) => setMarkdown(event.target.value)}
            onPaste={handlePaste}
            placeholder={"---\n# AI시대에 엔지니어는 '취향'을 탑니다\n\n최근에 VS Code에서 Colab(구글의 Jupyter 노트북)을 더 편하게 쓰고 싶어서 익스텐션 기능을 하나 추가했습니다.\n\n---\n\n# 두 번째 카드\n내용..."}
          />
          <p className="editor-hint">Use "---" to automatically split content into multiple slides.</p>
          <p className={cn("status-line", status.isError && "is-error")}>{status.message}</p>
        </section>

        <section className="preview-pane">
          <div className="pane-header preview-header">
            <p>Live Preview</p>
            <div className="preview-header-actions">
              <button type="button" className="preview-icon-btn" aria-label="리스트 보기">
                <LayoutList size={13} />
              </button>
              <button type="button" className="preview-icon-btn" aria-label="그리드 보기">
                <Grid2x2 size={13} />
              </button>
              <span className="preview-count">{previewFrames.length} Cards</span>
            </div>
          </div>

          {!markdown.trim() && <div className="preview-empty">왼쪽 에디터에 내용을 입력하면 카드 미리보기가 표시됩니다.</div>}

          {markdown.trim() && (
            <div className="preview-scroll">
              {previewState.loading && <div className="preview-message">렌더링 중...</div>}
              {!previewState.loading && previewState.error && (
                <div className="preview-message is-error">{previewState.error}</div>
              )}
              {!previewState.loading && !previewState.error && !previewFrames.length && (
                <div className="preview-message">카드가 생성되지 않았습니다.</div>
              )}

              {!previewState.loading &&
                !previewState.error &&
                previewFrames.map((frame) => (
                  <article
                    key={frame.key}
                    className="preview-card-shell"
                    style={{ width: `${scaledW}px`, height: `${scaledH}px` }}
                  >
                    <iframe
                      title={`card-${frame.index}`}
                      src={frame.url}
                      width={previewState.width}
                      height={previewState.height}
                      style={{
                        border: "none",
                        display: "block",
                        transform: `scale(${previewScale})`,
                        transformOrigin: "top left",
                      }}
                    />
                    <span className="preview-index">
                      {String(frame.index).padStart(2, "0")} / {String(frame.total).padStart(2, "0")}
                    </span>
                  </article>
                ))}
            </div>
          )}
        </section>
      </main>

      <footer className="bottombar">
        <p>Auto-saved locally</p>
        <p>Markdown Enabled</p>
      </footer>
    </div>
  );
}
