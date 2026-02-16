// Preset storage module — CRUD for custom presets via localStorage
// Requirements: 2.4, 2.5, 3.1–3.3, 4.2, 5.2, 5.4, 8.1–8.3

import PRESETS from "./presets";

const STORAGE_KEY = "instaCard.customPresets";

/** Load custom presets from localStorage. Returns {} on failure. */
export function loadCustomPresets() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return {};
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed;
        return {};
    } catch (err) {
        console.error("Failed to load custom presets:", err);
        return {};
    }
}

/** Save custom presets object to localStorage. */
export function saveCustomPresets(customPresets) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(customPresets));
    } catch (err) {
        console.error("Failed to save custom presets:", err);
        throw new Error("localStorage 저장에 실패했습니다.");
    }
}

/** Check if a name belongs to a built-in preset. */
export function isBuiltIn(name) {
    return Object.prototype.hasOwnProperty.call(PRESETS, name);
}

/** Merge built-in + custom presets. Built-in names are protected. */
export function getAllPresets() {
    const custom = loadCustomPresets();
    const merged = { ...PRESETS };
    for (const [name, preset] of Object.entries(custom)) {
        if (!isBuiltIn(name)) {
            merged[name] = preset;
        }
    }
    return merged;
}


/** Add a new custom preset. Rejects duplicate / built-in names. */
export function addCustomPreset(name, preset) {
    if (isBuiltIn(name)) {
        return { success: false, error: "기본 프리셋 이름은 사용할 수 없습니다." };
    }
    const custom = loadCustomPresets();
    if (custom[name]) {
        return { success: false, error: "이미 존재하는 프리셋 이름입니다." };
    }
    custom[name] = { ...preset };
    saveCustomPresets(custom);
    return { success: true };
}

/** Update an existing custom preset. */
export function updateCustomPreset(name, preset) {
    if (isBuiltIn(name)) {
        return { success: false, error: "기본 프리셋은 수정할 수 없습니다." };
    }
    const custom = loadCustomPresets();
    if (!custom[name]) {
        return { success: false, error: "존재하지 않는 프리셋입니다." };
    }
    custom[name] = { ...preset };
    saveCustomPresets(custom);
    return { success: true };
}

/** Delete a custom preset. Built-in deletion is rejected. */
export function deleteCustomPreset(name) {
    if (isBuiltIn(name)) {
        return { success: false, error: "기본 프리셋은 삭제할 수 없습니다." };
    }
    const custom = loadCustomPresets();
    if (!custom[name]) {
        return { success: false, error: "존재하지 않는 프리셋입니다." };
    }
    delete custom[name];
    saveCustomPresets(custom);
    return { success: true };
}

/** Duplicate a preset with a unique "-copy" name. */
export function duplicatePreset(sourceName) {
    const all = getAllPresets();
    const source = all[sourceName];
    if (!source) {
        return { error: "원본 프리셋을 찾을 수 없습니다." };
    }

    let newName = `${sourceName}-copy`;
    if (all[newName] || loadCustomPresets()[newName]) {
        let i = 2;
        while (all[`${sourceName}-copy-${i}`] || loadCustomPresets()[`${sourceName}-copy-${i}`]) {
            i++;
        }
        newName = `${sourceName}-copy-${i}`;
    }

    const preset = { ...source };
    const custom = loadCustomPresets();
    custom[newName] = preset;
    saveCustomPresets(custom);
    return { name: newName, preset };
}
