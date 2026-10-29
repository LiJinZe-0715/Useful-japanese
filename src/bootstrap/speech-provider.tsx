"use client";
import { useEffect, useState, type ReactNode } from "react";
import { createSpeechRuntime } from "./speech";
import {
  SpeechContextProvider,
  type SpeechContextValue,
} from "../modules/speech/presentation/speech-provider";

// Client-side composition root for speech: the runtime touches browser APIs, so
// it is created after mount and published through context. Presentation code
// only consumes the context.
export function SpeechProvider({ children }: { children: ReactNode }) {
  const [value, setValue] = useState<SpeechContextValue>();
  useEffect(() => {
    const runtime = createSpeechRuntime();
    const publish = () => setValue({ runtime, snapshot: runtime.getSnapshot() });
    publish();
    const unsubscribe = runtime.subscribe(publish);
    return () => {
      unsubscribe();
      runtime.dispose();
    };
  }, []);
  return <SpeechContextProvider value={value}>{children}</SpeechContextProvider>;
}
