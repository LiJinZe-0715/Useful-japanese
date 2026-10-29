"use client";
import { createContext, useContext, type ReactNode } from "react";
import type { createLearningRecords } from "../application/learning-records";

export type LearningRuntime = ReturnType<typeof createLearningRecords>;

const LearningContext = createContext<LearningRuntime | undefined>(undefined);

export function LearningContextProvider({
  value,
  children,
}: {
  value: LearningRuntime;
  children: ReactNode;
}) {
  return <LearningContext.Provider value={value}>{children}</LearningContext.Provider>;
}

export function useLearning() {
  const learning = useContext(LearningContext);
  if (!learning) throw Error("useLearning must be used inside LearningContextProvider");
  return learning;
}
