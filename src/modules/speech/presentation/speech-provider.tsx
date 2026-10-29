"use client";
import { createContext, useContext, type ReactNode } from "react";
// Type-only: the runtime is assembled in src/bootstrap, but the context shape
// has to match it exactly, so the type is imported rather than duplicated.
import type { SpeechRuntime } from "../../../bootstrap/speech";

export type SpeechContextValue = {
  runtime: SpeechRuntime;
  snapshot: ReturnType<SpeechRuntime["getSnapshot"]>;
};

const SpeechContext = createContext<SpeechContextValue | undefined>(undefined);

export function SpeechContextProvider({
  value,
  children,
}: {
  value: SpeechContextValue | undefined;
  children: ReactNode;
}) {
  return <SpeechContext.Provider value={value}>{children}</SpeechContext.Provider>;
}

export const useSpeech = () => useContext(SpeechContext);
