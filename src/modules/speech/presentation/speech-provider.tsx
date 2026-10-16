"use client";
import {createContext, type ReactNode, useContext, useEffect, useState} from "react";
import {createSpeechRuntime, type SpeechRuntime} from "../../../bootstrap/speech";

const SpeechContext = createContext<
    { runtime: SpeechRuntime; snapshot: ReturnType<SpeechRuntime["getSnapshot"]> } | undefined
>(undefined);

export function SpeechProvider({children}: { children: ReactNode }) {
    const [value, setValue] = useState<React.ContextType<typeof SpeechContext>>(undefined);
    useEffect(() => {
        const runtime = createSpeechRuntime();
        const refreshSnapshot = () => setValue({runtime, snapshot: runtime.getSnapshot()});
        refreshSnapshot();
        const unsubscribe = runtime.subscribe(refreshSnapshot);
        return () => {
            unsubscribe();
            runtime.dispose();
        };
    }, []);
    return <SpeechContext.Provider value={value}>{children}</SpeechContext.Provider>;
}

export const useSpeech = () => useContext(SpeechContext);
