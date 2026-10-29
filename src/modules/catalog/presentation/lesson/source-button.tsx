"use client";

export function SourceButton({ onOpen }: { onOpen: () => void }) {
  return <button onClick={onOpen}>查看原句</button>;
}
