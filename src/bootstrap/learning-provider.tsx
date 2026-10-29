"use client";
import type { ReactNode } from "react";
import { learning } from "./learning";
import { LearningContextProvider } from "../modules/learning/presentation/learning-provider";

// Client-side composition root for learning records: the singleton is created
// in src/bootstrap and handed to presentation through context, so components
// never import the composition root themselves.
export function LearningProvider({ children }: { children: ReactNode }) {
  return <LearningContextProvider value={learning}>{children}</LearningContextProvider>;
}
