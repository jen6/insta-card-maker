import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Code, Eye, Grid2x2, LayoutList, Menu, Plus, Save, Sparkles, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { renderMarkdownToCards } from "@/lib/renderer";
import { exportCardsToPng } from "@/lib/exporter";
import PresetManagerPanel from "./components/PresetManagerPanel";
import MilkdownEditor from "./components/MilkdownEditor";
import useStatus from "./hooks/useStatus";
import useInlineImages from "./hooks/useInlineImages";
import usePreviewRenderer from "./hooks/usePreviewRenderer";
import usePostManager from "./hooks/usePostManager";
import {
  PREVIEW_SCALE_DEFAULT, PREVIEW_SCALE_COLLAPSED,
  SIDEBAR_STATE_KEY, EDITOR_MODE_KEY,
  RATIO_OPTIONS, DEFAULT_STYLE_TABS,
  formatPresetLabel, formatRelative, getInitialSidebarState,
} from "./constants";

export default function App() {
  const { status, showStatus, clearTimer } = useStatus();
  const { makeRef, expandRefs, compactRefs } = useInlineImages();
  const { previewState, previewFrames, renderPreview, clearUrls } = usePreviewRenderer();

  const pm = usePostManager({ showStatus, compactRefs, expandRefs });

  const [sidebarCollapsed, setSidebarCollapsed] = useState(getInitialSidebarState);
  const [editorMode, setEditorMode] = useState(() => {
    try { return localStorage.getItem(EDITOR_MODE_KEY) || "wysiwyg"; } catch { return "wysiwyg"; }
  });
  const [exporting, setExporting] = useState(false);
  const [presetPanelOpen, setPresetPanelOpen] = useState(false);

  const markdownRef = useRef(null);
  const milkdownRef = useRef(null);

  const previewScale = sidebarCollapsed ? PREVIEW_SCALE_COLLAPSED : PREVIEW_SCALE_DEFAULT;
  const scaledW = useMemo(() => Math.round(previewState.width * previewScale), [previewScale, previewState.width]);
  const scaledH = useMemo(() => Math.round(previewState.height * previewScale), [previewScale, previewState.height]);

  const styleTabs = useMemo(() => {
    const names = pm.presets.map((item) => item.name).filter(Boolean);
    const source = names.length ? names : DEFAULT_STYLE_TABS;
    return source.map((value) => ({ value, label: formatPresetLabel(value) }));
  }, [pm.presets]);

  // --- helpers that need editor refs ---

  const getLatestMarkdown = useCallback(() => {
    if (milkdownRef.current?.flushChange) milkdownRef.current.flushChange();
    return milkdownRef.current?.getMarkdown?.() ?? pm.markdown;
  }, [pm.markdown]);

  const handleSave = useCallback(() => {
    pm.savePost(getLatestMarkdown());
  }, [getLatestMarkdown, pm]);

  const handleExport = useCallback(async () => {
    const md = expandRefs(getLatestMarkdown()).trim();
    if (!md) { showStatus("내보낼 내용이 없습니다.", true); return; }
    try {
      setExporting(true);
      const data = renderMarkdownToCards(md, {
        preset: pm.preset,
        firstSlidePreset: pm.firstSlidePreset || undefined,
        ratio: pm.ratio,
        backgroundImage: pm.bgImage.trim() || undefined,
        presets: pm.allPresetsMap,
      });
      if (!data.cards.length) { showStatus("생성된 카드가 없습니다.", true); return; }
      showStatus(`PNG 내보내기 중... (0/${data.cards.length})`);
      await exportCardsToPng(data.cards, data.width, data.height, ({ current, total }) => {
        showStatus(`PNG 내보내기 중... (${current}/${total})`);
      });
      showStatus(`${data.cards.length}장의 카드를 내보냈습니다.`);
    } catch (err) {
      showStatus(`내보내기 실패: ${err.message}`, true);
    } finally {
      setExporting(false);
    }
  }, [expandRefs, getLatestMarkdown, pm.allPresetsMap, pm.bgImage, pm.firstSlidePreset, pm.preset, pm.ratio, showStatus]);

  const handleImageUpload = useCallback(async (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(makeRef(String(reader.result || "")));
      reader.readAsDataURL(file);
    });
  }, [makeRef]);

  const insertAtCursor = useCallback((text, start, end) => {
    pm.setMarkdown((prev) => `${prev.slice(0, start)}${text}${prev.slice(end)}`);
    requestAnimationFrame(() => {
      const next = start + text.length;
      if (markdownRef.current) {
        markdownRef.current.selectionStart = next;
        markdownRef.current.selectionEnd = next;
        markdownRef.current.focus();
      }
    });
  }, [pm]);

  const handlePaste = useCallback(
    (event) => {
      const items = event.clipboardData?.items;
      if (items) {
        for (const item of items) {
          if (!item.type.startsWith("image/")) continue;
          event.preventDefault();
          const file = item.getAsFile();
          if (!file) return;
          const { selectionStart: start, selectionEnd: end } = event.target;
          const reader = new FileReader();
          reader.onload = () => {
            insertAtCursor(`![image](${makeRef(String(reader.result || ""))})`, start, end);
          };
          reader.readAsDataURL(file);
          return;
        }
      }
      const pastedText = event.clipboardData?.getData("text") || "";
      if (!pastedText.includes("data:image/")) return;
      event.preventDefault();
      const { selectionStart: start, selectionEnd: end } = event.target;
      insertAtCursor(compactRefs(pastedText), start, end);
    },
    [compactRefs, insertAtCursor, makeRef]
  );

  // --- effects ---

  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        renderPreview({
          markdown: pm.markdown, expandRefs, preset: pm.preset,
          firstSlidePreset: pm.firstSlidePreset, ratio: pm.ratio,
          bgImage: pm.bgImage, presetsMap: pm.allPresetsMap,
        });
      } catch (err) { showStatus(err.message, true); }
    }, 400);
    return () => clearTimeout(timer);
  }, [expandRefs, pm.markdown, pm.preset, pm.firstSlidePreset, pm.ratio, pm.bgImage, pm.allPresetsMap, renderPreview, showStatus]);

  useEffect(() => {
    try {
      pm.loadPresets();
      pm.loadPostList();
      pm.initFirstVisit();
    } catch (err) { showStatus(err.message, true); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    try { localStorage.setItem(EDITOR_MODE_KEY, editorMode); } catch { /* no-op */ }
  }, [editorMode]);

  useEffect(() => {
    try { localStorage.setItem(SIDEBAR_STATE_KEY, sidebarCollapsed ? "1" : "0"); } catch { /* no-op */ }
  }, [sidebarCollapsed]);

  useEffect(() => () => { clearTimer(); clearUrls(); }, [clearTimer, clearUrls]);

  // --- render ---

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-left">
          <button type="button" className="icon-button" onClick={() => setSidebarCollapsed((p) => !p)}
            aria-expanded={!sidebarCollapsed} aria-label={sidebarCollapsed ? "라이브러리 열기" : "라이브러리 닫기"}>
            <Menu size={17} />
          </button>
          <button type="button" className="icon-button is-dark" aria-label="스타일 메뉴"><Sparkles size={15} /></button>
          <div className="brand-row">
            <p className="brand-title">Insta Card Maker</p>
            <p className="brand-meta">v2.0 Beta</p>
          </div>
        </div>

        <div className="topbar-center">
          <span className="toolbar-label">Styles</span>
          <div className="style-tabs">
            {styleTabs.map((tab) => (
              <button key={tab.value} type="button" className={cn("style-tab", tab.value === pm.preset && "is-active")}
                onClick={() => pm.setPreset(tab.value)}>{tab.label}</button>
            ))}
          </div>
          <button type="button" className="style-manage-btn" onClick={() => setPresetPanelOpen(true)} title="프리셋 관리">
            <Sparkles size={13} />
          </button>
          <label className="cover-preset-wrap">
            <span className="toolbar-label">Cover</span>
            <select value={pm.firstSlidePreset} onChange={(e) => pm.setFirstSlidePreset(e.target.value)} className="cover-preset-select">
              <option value="">없음 (본문과 동일)</option>
              {styleTabs.map((tab) => (<option key={tab.value} value={tab.value}>{tab.label}</option>))}
            </select>
          </label>
        </div>

        <div className="topbar-right">
          <label className="ratio-select-wrap">
            <span className="sr-only">비율 선택</span>
            <select value={pm.ratio} onChange={(e) => pm.setRatio(e.target.value)} className="ratio-select">
              {RATIO_OPTIONS.map((o) => (<option key={o} value={o}>{o} Instagram Portrait</option>))}
            </select>
          </label>
          <button type="button" className="primary-cta" disabled={exporting} onClick={handleExport}>
            {exporting ? "Exporting..." : "Export"}
          </button>
        </div>
      </header>

      <main className={cn("workspace-grid", sidebarCollapsed && "is-sidebar-collapsed")}>
        <aside className={cn("library-pane", sidebarCollapsed && "is-collapsed")}>
          <div className="pane-header">
            <p>Library</p>
            <button type="button" className="link-btn" onClick={pm.resetToNewPost}><Plus size={14} /></button>
          </div>
          <div className="library-list">
            {!pm.savedPosts.length && <p className="empty-hint">저장된 게시물이 없습니다.</p>}
            {pm.savedPosts.map((post) => (
              <button key={post.id} type="button" className={cn("library-item", post.id === pm.currentPostId && "is-active")}
                onClick={() => pm.loadPost(post.id)}>
                <p className="library-item-title">{post.title || "제목 없음"}</p>
                <p className="library-item-meta">{formatRelative(post.updatedAt)}</p>
              </button>
            ))}
          </div>
        </aside>

        <section className="editor-pane">
          <div className="editor-title-row">
            <input className="editor-title-input" value={pm.postTitle} onChange={(e) => pm.setPostTitle(e.target.value)} placeholder="제목을 입력하세요" />
            <div className="editor-tools">
              <button type="button" className={cn("editor-mode-btn", editorMode === "wysiwyg" && "is-active")}
                onClick={() => setEditorMode("wysiwyg")} title="WYSIWYG 에디터"><Eye size={12} /></button>
              <button type="button" className={cn("editor-mode-btn", editorMode === "markdown" && "is-active")}
                onClick={() => setEditorMode("markdown")} title="마크다운 에디터"><Code size={12} /></button>
            </div>
          </div>
          <div className="editor-action-row">
            <button type="button" className="action-btn dark" onClick={handleSave}><Save size={14} /> Save</button>
            <button type="button" className="action-btn" onClick={pm.resetToNewPost}><Plus size={14} /> New Slide</button>
            <button type="button" className="action-btn" disabled={!pm.currentPostId} onClick={pm.deletePost}><Trash2 size={14} /> Delete</button>
          </div>
          {editorMode === "wysiwyg" ? (
            <MilkdownEditor ref={milkdownRef} value={pm.markdown} onChange={pm.setMarkdown} onImageUpload={handleImageUpload} />
          ) : (
            <textarea ref={markdownRef} className="editor-textarea" value={pm.markdown}
              onChange={(e) => pm.setMarkdown(e.target.value)} onPaste={handlePaste} placeholder="" />
          )}
          <p className="editor-hint">Use "---" to automatically split content into multiple slides.</p>
          <p className={cn("status-line", status.isError && "is-error")}>{status.message}</p>
        </section>

        <section className="preview-pane">
          <div className="pane-header preview-header">
            <p>Live Preview</p>
            <div className="preview-header-actions">
              <button type="button" className="preview-icon-btn" aria-label="리스트 보기"><LayoutList size={13} /></button>
              <button type="button" className="preview-icon-btn" aria-label="그리드 보기"><Grid2x2 size={13} /></button>
              <span className="preview-count">{previewFrames.length} Cards</span>
            </div>
          </div>
          {!pm.markdown.trim() && <div className="preview-empty">왼쪽 에디터에 내용을 입력하면 카드 미리보기가 표시됩니다.</div>}
          {pm.markdown.trim() && (
            <div className="preview-scroll">
              {previewState.loading && <div className="preview-message">렌더링 중...</div>}
              {!previewState.loading && previewState.error && <div className="preview-message is-error">{previewState.error}</div>}
              {!previewState.loading && !previewState.error && !previewFrames.length && <div className="preview-message">카드가 생성되지 않았습니다.</div>}
              {!previewState.loading && !previewState.error && previewFrames.map((frame) => (
                <article key={frame.key} className="preview-card-shell" style={{ width: `${scaledW}px`, height: `${scaledH}px` }}>
                  <iframe title={`card-${frame.index}`} src={frame.url} width={previewState.width} height={previewState.height}
                    style={{ border: "none", display: "block", transform: `scale(${previewScale})`, transformOrigin: "top left" }} />
                  <span className="preview-index">{String(frame.index).padStart(2, "0")} / {String(frame.total).padStart(2, "0")}</span>
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

      <PresetManagerPanel open={presetPanelOpen} onClose={() => setPresetPanelOpen(false)}
        onPresetsChange={(newPresets) => { pm.setAllPresetsMap(newPresets); pm.loadPresets(); }}
        currentPreset={pm.preset} onSelectPreset={(name) => { pm.setPreset(name); setPresetPanelOpen(false); }}
        previewMarkdown={pm.markdown} previewRatio={pm.ratio} />
    </div>
  );
}
