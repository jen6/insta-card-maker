import { useState, useCallback } from "react";
import { X, Plus, Copy, Pencil, Trash2 } from "lucide-react";
import PresetEditor from "./PresetEditor";
import {
    getAllPresets,
    addCustomPreset,
    updateCustomPreset,
    deleteCustomPreset,
    duplicatePreset,
    isBuiltIn,
} from "@/lib/presetStorage";
import PRESETS from "@/lib/presets";

// Default preset values for new presets (based on "reference")
const DEFAULT_PRESET = PRESETS.reference;

export default function PresetManagerPanel({
    open,
    onClose,
    onPresetsChange,
    currentPreset,
    onSelectPreset,
    previewMarkdown,
    previewRatio,
}) {
    const [mode, setMode] = useState("list"); // "list" | "edit"
    const [editName, setEditName] = useState("");
    const [editPreset, setEditPreset] = useState(null);
    const [editIsNew, setEditIsNew] = useState(true);

    const allPresets = getAllPresets();
    const builtInNames = Object.keys(PRESETS);
    const customNames = Object.keys(allPresets).filter((n) => !isBuiltIn(n));

    const notifyChange = useCallback(() => {
        onPresetsChange(getAllPresets());
    }, [onPresetsChange]);

    const handleNew = () => {
        setEditName("");
        setEditPreset({ ...DEFAULT_PRESET });
        setEditIsNew(true);
        setMode("edit");
    };

    const handleEdit = (name) => {
        setEditName(name);
        setEditPreset({ ...allPresets[name] });
        setEditIsNew(false);
        setMode("edit");
    };

    const handleDuplicate = (name) => {
        const result = duplicatePreset(name);
        if (result.error) {
            alert(result.error);
            return;
        }
        notifyChange();
    };

    const handleDelete = (name) => {
        if (!window.confirm(`"${name}" 프리셋을 삭제할까요?`)) return;
        const result = deleteCustomPreset(name);
        if (!result.success) {
            alert(result.error);
            return;
        }
        if (currentPreset === name) {
            onSelectPreset("reference");
        }
        notifyChange();
    };

    const handleSave = (name, preset) => {
        let result;
        if (editIsNew) {
            result = addCustomPreset(name, preset);
        } else {
            result = updateCustomPreset(name, preset);
        }
        if (!result.success) {
            alert(result.error);
            return;
        }
        notifyChange();
        setMode("list");
    };

    if (!open) return null;

    return (
        <div className="preset-panel-overlay" onClick={onClose}>
            <aside className="preset-panel" onClick={(e) => e.stopPropagation()}>
                <div className="preset-panel-header">
                    <h2>✨ 프리셋 관리</h2>
                    <button type="button" className="preset-panel-close" onClick={onClose}>
                        <X size={16} />
                    </button>
                </div>

                {mode === "list" ? (
                    <div className="preset-panel-body">
                        <button type="button" className="preset-new-btn" onClick={handleNew}>
                            <Plus size={14} /> 새 프리셋 만들기
                        </button>

                        <div className="preset-section-label">기본 프리셋</div>
                        {builtInNames.map((name) => (
                            <PresetCard
                                key={name}
                                name={name}
                                preset={allPresets[name]}
                                isActive={currentPreset === name}
                                isBuiltIn
                                onSelect={() => onSelectPreset(name)}
                                onDuplicate={() => handleDuplicate(name)}
                            />
                        ))}

                        <div className="preset-section-label">사용자 정의 프리셋</div>
                        {customNames.length === 0 && (
                            <p className="preset-empty-msg">
                                사용자 정의 프리셋이 없습니다.<br />
                                기본 프리셋을 복제하여 시작해보세요.
                            </p>
                        )}
                        {customNames.map((name) => (
                            <PresetCard
                                key={name}
                                name={name}
                                preset={allPresets[name]}
                                isActive={currentPreset === name}
                                isBuiltIn={false}
                                onSelect={() => onSelectPreset(name)}
                                onEdit={() => handleEdit(name)}
                                onDuplicate={() => handleDuplicate(name)}
                                onDelete={() => handleDelete(name)}
                            />
                        ))}
                    </div>
                ) : (
                    <PresetEditor
                        initialName={editName}
                        initialPreset={editPreset}
                        isNew={editIsNew}
                        onSave={handleSave}
                        onCancel={() => setMode("list")}
                        previewMarkdown={previewMarkdown}
                        previewRatio={previewRatio}
                    />
                )}
            </aside>
        </div>
    );
}

function PresetCard({ name, preset, isActive, isBuiltIn: builtIn, onSelect, onEdit, onDuplicate, onDelete }) {
    const label = name
        .split("-")
        .filter(Boolean)
        .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
        .join(" ");

    return (
        <div
            className={`preset-card ${isActive ? "is-active" : ""}`}
            onClick={onSelect}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && onSelect()}
        >
            <div className="preset-card-info">
                <div className="preset-card-colors">
                    <span className="preset-color-dot" style={{ background: preset.titleColor }} />
                    <span className="preset-color-dot" style={{ background: preset.bgColor }} />
                </div>
                <div>
                    <p className="preset-card-name">{label}</p>
                    <p className="preset-card-desc">{preset.description || ""}</p>
                </div>
            </div>
            <div className="preset-card-actions" onClick={(e) => e.stopPropagation()}>
                {!builtIn && onEdit && (
                    <button type="button" className="preset-card-btn" onClick={onEdit} title="편집">
                        <Pencil size={12} />
                    </button>
                )}
                <button type="button" className="preset-card-btn" onClick={onDuplicate} title="복제">
                    <Copy size={12} />
                </button>
                {!builtIn && onDelete && (
                    <button type="button" className="preset-card-btn preset-card-btn-danger" onClick={onDelete} title="삭제">
                        <Trash2 size={12} />
                    </button>
                )}
            </div>
        </div>
    );
}
