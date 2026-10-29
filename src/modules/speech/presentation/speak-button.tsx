// Server-safe: emits plain markup plus a `data-speak` hook. A single client
// island (`SpeechDelegator`) handles the clicks, so pages with thousands of
// entries do not pay for one client component boundary per button.
export function SpeakButton({ text, label = "朗读" }: { text: string; label?: string }) {
  return (
    <button type="button" data-speak={text}>
      {label}
    </button>
  );
}
