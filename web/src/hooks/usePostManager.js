import { useCallback, useState } from "react";
import * as storage from "@/lib/storage";
import { getAllPresets } from "@/lib/presetStorage";
import { DEFAULT_STYLE_TABS, FIRST_VISIT_KEY, EXAMPLE_MARKDOWN } from "../constants";

export default function usePostManager({ showStatus, compactRefs, expandRefs }) {
    const [savedPosts, setSavedPosts] = useState([]);
    const [currentPostId, setCurrentPostId] = useState(null);
    const [postTitle, setPostTitle] = useState("");
    const [markdown, setMarkdown] = useState("");
    const [preset, setPreset] = useState("reference");
    const [firstSlidePreset, setFirstSlidePreset] = useState("");
    const [ratio, setRatio] = useState("4:5");
    const [bgImage, setBgImage] = useState("");
    const [presets, setPresets] = useState([]);
    const [allPresetsMap, setAllPresetsMap] = useState(() => getAllPresets());

    const loadPresets = useCallback(() => {
        const all = getAllPresets();
        setAllPresetsMap(all);
        const list = Object.entries(all).map(([name, p]) => ({
            name,
            description: p.description,
            titleColor: p.titleColor,
            bgColor: p.bgColor,
        }));
        setPresets(list);
        setPreset((current) => {
            if (list.some((item) => item.name === current)) return current;
            if (list.some((item) => item.name === "reference")) return "reference";
            return list[0]?.name || current;
        });
    }, []);

    const loadPostList = useCallback(() => {
        setSavedPosts(storage.listPosts());
    }, []);

    const loadPost = useCallback(
        (postId) => {
            const data = storage.getPost(postId);
            if (!data) { showStatus("게시물을 찾을 수 없습니다.", true); return; }
            setCurrentPostId(data.id);
            setPostTitle(data.title || "");
            setMarkdown(compactRefs(String(data.markdown || "")));
            setPreset(data.preset || "reference");
            setFirstSlidePreset(data.firstSlidePreset || "");
            setRatio(data.ratio || "4:5");
            setBgImage(data.backgroundImage || "");
            showStatus("게시물을 불러왔습니다.");
        },
        [compactRefs, showStatus]
    );

    const resetToNewPost = useCallback(() => {
        setCurrentPostId(null);
        setPostTitle("");
        setMarkdown("");
        setFirstSlidePreset("");
        setBgImage("");
        showStatus("새 게시물 작성 모드");
    }, [showStatus]);

    const savePost = useCallback(
        (latestMarkdown) => {
            const payload = {
                title: postTitle.trim(),
                markdown: expandRefs(latestMarkdown),
                preset,
                firstSlidePreset,
                ratio,
                backgroundImage: bgImage.trim(),
            };
            if (!payload.markdown.trim()) {
                showStatus("본문(markdown)을 입력해 주세요.", true);
                return;
            }
            const isUpdate = Boolean(currentPostId);
            let data;
            if (isUpdate) {
                data = storage.updatePost(currentPostId, payload);
                if (!data) { showStatus("게시물을 찾을 수 없습니다.", true); return; }
            } else {
                data = storage.createPost(payload);
            }
            setCurrentPostId(data.id);
            if (data.title) setPostTitle(data.title);
            loadPostList();
            showStatus(isUpdate ? "게시물을 수정했습니다." : "게시물을 저장했습니다.");
        },
        [bgImage, currentPostId, expandRefs, firstSlidePreset, loadPostList, postTitle, preset, ratio, showStatus]
    );

    const deletePost = useCallback(() => {
        if (!currentPostId) return;
        if (!window.confirm("현재 게시물을 삭제할까요?")) return;
        const ok = storage.deletePost(currentPostId);
        if (!ok) { showStatus("게시물을 찾을 수 없습니다.", true); return; }
        setCurrentPostId(null);
        setPostTitle("");
        setMarkdown("");
        setFirstSlidePreset("");
        setBgImage("");
        loadPostList();
        showStatus("게시물을 삭제했습니다.");
    }, [currentPostId, loadPostList, showStatus]);

    const initFirstVisit = useCallback(() => {
        const isFirstVisit = !localStorage.getItem(FIRST_VISIT_KEY);
        const hasPosts = storage.listPosts().length > 0;
        if (isFirstVisit && !hasPosts) {
            const examplePost = storage.createPost({
                title: "📸 Insta Card Maker 사용법",
                markdown: EXAMPLE_MARKDOWN,
                preset: "reference",
                ratio: "4:5",
                backgroundImage: "",
            });
            setSavedPosts(storage.listPosts());
            setCurrentPostId(examplePost.id);
            setPostTitle(examplePost.title);
            setMarkdown(EXAMPLE_MARKDOWN);
            setPreset("reference");
            setRatio("4:5");
            localStorage.setItem(FIRST_VISIT_KEY, "1");
        }
    }, []);

    return {
        savedPosts, currentPostId, postTitle, setPostTitle,
        markdown, setMarkdown, preset, setPreset,
        firstSlidePreset, setFirstSlidePreset, ratio, setRatio,
        bgImage, setBgImage, presets, allPresetsMap, setAllPresetsMap,
        loadPresets, loadPostList, loadPost, resetToNewPost,
        savePost, deletePost, initFirstVisit,
    };
}
