"use client";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { createSpeechRuntime, type SpeechRuntime } from "../../../bootstrap/speech";
const Context = createContext<
  { runtime: SpeechRuntime; snapshot: ReturnType<SpeechRuntime["getSnapshot"]> } | undefined
>(undefined);
export function SpeechProvider({ children }: { children: ReactNode }) {
  const [value, setValue] = useState<React.ContextType<typeof Context>>(undefined);
  useEffect(() => {
    const runtime = createSpeechRuntime();
    const refresh = () => setValue({ runtime, snapshot: runtime.getSnapshot() });
    refresh();
    const unsubscribe = runtime.subscribe(refresh);
    return () => {
      unsubscribe();
      runtime.dispose();
    };
  }, []);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export const useSpeech = () => useContext(Context);
