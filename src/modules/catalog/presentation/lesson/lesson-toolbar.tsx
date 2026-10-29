"use client";

export function LessonToolbar({
  bookmarked,
  completed,
  loaded,
  position,
  showZh,
  showReading,
  onToggleBookmark,
  onToggleCompleted,
  onShowZh,
  onShowReading,
  onResume,
}: {
  bookmarked: boolean;
  completed: boolean;
  loaded: boolean;
  position: string;
  showZh: boolean;
  showReading: boolean;
  onToggleBookmark: () => void;
  onToggleCompleted: () => void;
  onShowZh: (value: boolean) => void;
  onShowReading: (value: boolean) => void;
  onResume: () => void;
}) {
  return (
    <div className="controls lesson-toolbar">
      <button aria-pressed={bookmarked} disabled={!loaded} onClick={onToggleBookmark}>
        {bookmarked ? "已收藏" : "收藏"}
      </button>
      <button aria-pressed={completed} disabled={!loaded} onClick={onToggleCompleted}>
        {completed ? "已学过 ✓" : "标记学过"}
      </button>
      <label>
        <input
          type="checkbox"
          checked={showZh}
          onChange={(event) => onShowZh(event.target.checked)}
        />
        显示中文
      </label>
      <label>
        <input
          type="checkbox"
          checked={showReading}
          onChange={(event) => onShowReading(event.target.checked)}
        />
        显示读音
      </label>
      {position && <button onClick={onResume}>回到上次区块</button>}
    </div>
  );
}
