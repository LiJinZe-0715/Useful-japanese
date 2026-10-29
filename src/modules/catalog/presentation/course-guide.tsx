import type { Course } from "../domain/content";
import { href } from "../../../shared/paths";

// Course-directory introduction. Lives in data (`course.json` → `guide`) so the
// route stays free of per-course copy; the footnote keeps a `{link}` slot for
// the workplace vocabulary entry point.
export function CourseGuide({
  courseId,
  guide,
}: {
  courseId: string;
  guide: NonNullable<Course["guide"]>;
}) {
  const [beforeLink, afterLink] = guide.footnote.split("{link}");
  return (
    <section>
      <h2>{guide.heading}</h2>
      <p>{guide.intro}</p>
      <ul>
        {guide.tracks.map((track) => (
          <li key={track.lessonId}>
            <a href={href(`/courses/${courseId}/${track.lessonId}/`)}>{track.label}</a>：
            {track.note}
          </li>
        ))}
      </ul>
      <p>
        {beforeLink}
        <a href={href("/vocabulary/")}>商务与职场词汇</a>
        {afterLink}
      </p>
    </section>
  );
}
