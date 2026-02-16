import { useCallback, useRef, useState } from "react";

export default function useStatus() {
    const [status, setStatus] = useState({ message: "", isError: false });
    const timerRef = useRef(null);

    const showStatus = useCallback((message, isError = false) => {
        setStatus({ message: String(message || ""), isError });
        if (!message) return;
        clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
            setStatus((prev) => (prev.message === message ? { message: "", isError: false } : prev));
        }, 2400);
    }, []);

    const clearTimer = useCallback(() => clearTimeout(timerRef.current), []);

    return { status, showStatus, clearTimer };
}
