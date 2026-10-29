"use client";
import { useEffect } from "react";
import { useSpeech } from "./speech-provider";

// One delegated click listener for every `data-speak` button on the page. This
// keeps speak buttons as static markup: no per-button client component, no
// serialized props, and no hydration cost proportional to the content size.
export function SpeechDelegator() {
  const speech = useSpeech();
  useEffect(() => {
    if (!speech) return;
    const onClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const button = target.closest("[data-speak]");
      if (!(button instanceof HTMLElement)) return;
      const text = button.dataset.speak;
      if (text) void speech.runtime.queue.play([{ text }]);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [speech]);
  return null;
}
