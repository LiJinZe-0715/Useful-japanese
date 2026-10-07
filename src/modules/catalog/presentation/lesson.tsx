"use client";
import { useEffect, useState } from "react";
import type { Course, Lesson } from "../domain/content";
import { dialogueSegmentId, isDialogueLineActive } from "../application/dialogue-playback";
import { learning } from "../../../bootstrap/learning";
import { emptyRecord } from "../../learning/domain/record";
import {
  AudioControls,
  SpeakButton,
  SpeechStatus,
  VoiceSettings,
} from "../../speech/presentation/controls";
import { useSpeech } from "../../speech/presentation/provider";
import { href } from "../../../shared/paths";
type Example = { ja: string; zh?: string; ttsText?: string };
function Examples({ items, showZh }: { items: Example[]; showZh: boolean }) {
  return (
    <>
      {items.map((e, i) => (
        <div className="example-line" key={i}>
          <div>
            <p lang="ja">{e.ja}</p>
            {showZh && e.zh && <p className="translation">{e.zh}</p>}
          </div>
          <SpeakButton text={e.ttsText ?? e.ja} label="播放例句" />
        </div>
      ))}
    </>
  );
}
export function LessonView({
  course,
  lesson,
  previous,
  next,
}: {
  course: Course;
  lesson: Lesson;
  previous?: string;
  next?: string;
}) {
  const speech = useSpeech();
  const runtime = speech?.runtime;
  const [record, setRecord] = useState(emptyRecord);
  const [loaded, setLoaded] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const sectionLinks = [
    { id: "objectives", title: "目标", available: !!lesson.objectives.length },
    {
      id: "text",
      title: "听读",
      available: !!(
        lesson.scene ||
        lesson.dialogues?.some((d) => d.lines.length) ||
        lesson.materials?.length
      ),
    },
    { id: "vocabulary", title: "词汇", available: !!lesson.vocabulary?.length },
    { id: "expressions", title: "句型", available: !!lesson.expressions?.length },
    {
      id: "grammar",
      title: "文法",
      available: !!lesson.grammar?.length,
    },
    { id: "homework", title: "作业", available: !!lesson.homework?.length },
  ].filter((item) => item.available);
  const [activeSection, setActiveSection] = useState(
    sectionLinks.find((item) => item.id === "text")?.id ?? sectionLinks[0]?.id ?? "",
  );
  const [showZh, setShowZh] = useState(true),
    [reading, setReading] = useState(false),
    [dialogueId, setDialogueId] = useState(lesson.dialogues?.[0]?.id ?? ""),
    [selected, setSelected] = useState<string[]>([]),
    [loop, setLoop] = useState(false);
  useEffect(() => {
    setRecord(learning.load(course.id, lesson.id));
    setLoaded(true);
  }, [course.id, lesson.id]);
  useEffect(() => () => runtime?.queue.stop(), [runtime]);
  useEffect(() => {
    if (loaded) setSaveFailed(!learning.save(course.id, lesson.id, record));
  }, [course.id, lesson.id, record, loaded]);
  const dialogue = lesson.dialogues?.find((d) => d.id === dialogueId);
  const learner = lesson.speakers?.find((speaker) => speaker.id === lesson.learnerSpeakerId);
  const roleKey = (id: string) => `${course.id}:${lesson.id}:${id}`;
  const segment = (
    line: NonNullable<Lesson["dialogues"]>[number]["lines"][number],
    sourceDialogueId = dialogueId,
  ) => ({
    id: dialogueSegmentId(course.id, lesson.id, sourceDialogueId, line.id),
    text: line.ttsText ?? line.ja,
    speakerId: roleKey(line.speakerId),
    voice: lesson.speakers?.find((s) => s.id === line.speakerId)?.voice,
  });
  const lines = dialogue?.lines ?? [];
  const items = lines
    .filter((l) => !selected.length || selected.includes(l.id))
    .map((l) => segment(l));
  const openSection = (id: string) => {
    runtime?.queue.stop();
    setActiveSection(id);
    setRecord((r) => ({ ...r, position: id }));
    requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ block: "start" }));
  };
  const section = (id: string, title: string, children: React.ReactNode) => (
    <section
      id={id}
      hidden={activeSection !== id}
      onFocus={() => setRecord((r) => ({ ...r, position: id }))}
    >
      <p className="eyebrow">
        {String(sectionLinks.findIndex((item) => item.id === id) + 1).padStart(2, "0")} /{" "}
        {sectionLinks.find((item) => item.id === id)?.title}
      </p>
      <h2>{title}</h2>
      {children}
    </section>
  );
  const sourceLink = (source: { dialogueId: string; lineId: string } | undefined) =>
    source && (
      <button
        onClick={() => {
          runtime?.queue.stop();
          setDialogueId(source.dialogueId);
          setSelected([source.lineId]);
          openSection("text");
        }}
      >
        查看原句
      </button>
    );
  return (
    <article className="lesson-workspace">
      <p className="eyebrow">
        {course.title} ·{" "}
        {lesson.level ?? (course.learningMode === "business" ? "商务模式" : "生活模式")}
      </p>
      <h1>{lesson.title}</h1>
      <p className="page-description">{lesson.objectives[0]}</p>
      <div className="controls lesson-toolbar">
        <button
          aria-pressed={record.bookmarked}
          onClick={() => setRecord((r) => ({ ...r, bookmarked: !r.bookmarked }))}
        >
          {record.bookmarked ? "已收藏" : "收藏"}
        </button>
        <button
          aria-pressed={record.completed}
          onClick={() => setRecord((r) => ({ ...r, completed: !r.completed }))}
        >
          {record.completed ? "已学过 ✓" : "标记学过"}
        </button>
        <label>
          <input type="checkbox" checked={showZh} onChange={(e) => setShowZh(e.target.checked)} />
          显示中文
        </label>
        <label>
          <input type="checkbox" checked={reading} onChange={(e) => setReading(e.target.checked)} />
          显示读音
        </label>
        {record.position && (
          <button onClick={() => openSection(record.position)}>回到上次区块</button>
        )}
      </div>
      <p className="muted">“已学过”仅记录学习经历，不代表语言能力分数。</p>
      {saveFailed && (
        <p role="alert">
          学习记录保存失败，当前修改仅保留在本页。请先复制书面草稿，刷新或离开页面会丢失未保存的内容。
        </p>
      )}
      <VoiceSettings roles={lesson.speakers?.map((s) => ({ id: roleKey(s.id), name: s.name }))} />
      <SpeechStatus />
      <nav className="lesson-tabs" aria-label="本课学习环节">
        {sectionLinks.map((item, index) => (
          <button
            key={item.id}
            aria-controls={item.id}
            aria-pressed={activeSection === item.id}
            onClick={() => openSection(item.id)}
          >
            <span>{String(index + 1).padStart(2, "0")}</span>
            {item.title}
          </button>
        ))}
      </nav>
      {!!lesson.objectives.length &&
        section(
          "objectives",
          "当前课程目标",
          <ul className="objective-list">
            {lesson.objectives.map((o) => (
              <li key={o}>{o}</li>
            ))}
          </ul>,
        )}
      {(lesson.scene || lines.length > 0 || lesson.materials?.length) &&
        section(
          "text",
          "场景课文与听读练习",
          <>
            {lesson.scene && (
              <div className="scene">
                <p>{lesson.scene.background}</p>
                <p className="muted">
                  渠道：
                  {
                    {
                      "in-person": "当面",
                      phone: "电话",
                      meeting: "会议",
                      email: "邮件",
                      chat: "消息",
                      other: "其他",
                    }[lesson.scene.channel]
                  }{" "}
                  · 关系：{lesson.scene.relationships}
                </p>
                <ul>
                  {lesson.scene.tasks.map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
              </div>
            )}
            {!!lesson.dialogues?.length && (
              <>
                <p className="muted">
                  你扮演的角色：<strong>{learner?.name}</strong> · {learner?.role}
                </p>
                <label>
                  课文版本{" "}
                  <select
                    value={dialogueId}
                    onChange={(e) => {
                      runtime?.queue.stop();
                      setDialogueId(e.target.value);
                      setSelected([]);
                    }}
                  >
                    {lesson.dialogues.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.title}（
                        {{ main: "主课文", branch: "场景分支", register: "语体版本" }[d.variant]}）
                      </option>
                    ))}
                  </select>
                </label>
                <AudioControls items={items} loop={loop} onLoop={setLoop} />
                <p className="muted">
                  未选择句子时播放整段；勾选句子后播放选定片段。声音为合成语音。
                </p>
                {lines.map((line, i) => (
                  <div
                    className={`dialogue-line ${line.speakerId === learner?.id ? "speaker-primary" : ""} ${isDialogueLineActive(speech?.snapshot.state, dialogueSegmentId(course.id, lesson.id, dialogueId, line.id)) ? "active" : ""}`}
                    key={line.id}
                  >
                    <label
                      className="dialogue-speaker"
                      title={lesson.speakers?.find((s) => s.id === line.speakerId)?.role}
                    >
                      <input
                        type="checkbox"
                        aria-label={`选择 ${line.id}`}
                        checked={selected.includes(line.id)}
                        onChange={(e) =>
                          setSelected((v) =>
                            e.target.checked ? [...v, line.id] : v.filter((id) => id !== line.id),
                          )
                        }
                      />
                      <span>{lesson.speakers?.find((s) => s.id === line.speakerId)?.name}</span>
                      <small>{String(i + 1).padStart(2, "0")}</small>
                    </label>
                    <button
                      className="dialogue-sentence"
                      aria-label={`逐句播放 ${i + 1}`}
                      onClick={() => void runtime?.queue.play([segment(line)])}
                    >
                      <span lang="ja">{line.ja}</span>
                      {reading && line.reading && <span className="reading">{line.reading}</span>}
                      {showZh && <span className="translation">{line.zh}</span>}
                      <span className="sentence-play">▷ 播放这句</span>
                    </button>
                  </div>
                ))}
              </>
            )}
            {lesson.materials?.map((m) => (
              <div className="material" key={m.id}>
                <h3>{m.title}</h3>
                {m.blocks.map((b, i) =>
                  b.type === "paragraph" ? (
                    <div className="material-paragraph" key={i}>
                      {b.hideTranscript ? (
                        <details>
                          <summary>查看听力原文</summary>
                          <p lang="ja">{b.ja}</p>
                          {reading && b.reading && <p className="reading">{b.reading}</p>}
                          {showZh && b.zh && <p className="translation">{b.zh}</p>}
                        </details>
                      ) : (
                        <>
                          <p lang="ja">{b.ja}</p>
                          {reading && b.reading && <p className="reading">{b.reading}</p>}
                          {showZh && b.zh && <p className="translation">{b.zh}</p>}
                        </>
                      )}
                      <SpeakButton
                        text={b.ttsText ?? b.ja}
                        label={b.hideTranscript ? "播放听力" : "朗读"}
                      />
                    </div>
                  ) : b.type === "list" ? (
                    <ul key={i}>
                      {b.items.map((v, j) => (
                        <li key={j}>
                          <Examples items={[v]} showZh={showZh} />
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="table-scroll" key={i}>
                      <table>
                        <thead>
                          <tr>
                            {b.headers.map((h, j) => (
                              <th key={j}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {b.rows.map((r, j) => (
                            <tr key={j}>
                              {r.map((c, k) => (
                                <td key={k}>{c}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ),
                )}
                {m.asset && (
                  <a href={href(`/course-assets/${course.id}/${m.asset.slice(7)}`)}>查看关联素材</a>
                )}
              </div>
            ))}
            {!!lesson.shadowing?.length && (
              <div>
                <h3>听后跟读与影子跟读</h3>
                <p>
                  听后跟读：先听一句，暂停后模仿。影子跟读：熟悉意思后，播放原句并稍晚同步跟读；可降低语速和循环片段。
                </p>
                {lesson.shadowing.map((p) => (
                  <div className="practice-entry" key={p.id}>
                    <p>{p.prompt}</p>
                    <button
                      onClick={() => {
                        const d = lesson.dialogues?.find((d) => d.id === p.dialogueId);
                        setDialogueId(p.dialogueId);
                        setSelected(p.lineIds ?? []);
                        void runtime?.queue.play(
                          (d?.lines ?? [])
                            .filter((l) => !p.lineIds?.length || p.lineIds.includes(l.id))
                            .map((l) => segment(l, p.dialogueId)),
                          loop,
                        );
                      }}
                    >
                      播放跟读原句
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>,
        )}
      {!!lesson.vocabulary?.length &&
        section(
          "vocabulary",
          "本课词汇",
          lesson.vocabulary.map((v) => (
            <div className="entry vocabulary-entry" key={v.id}>
              <div className="entry-heading">
                <div>
                  <h3 lang="ja">
                    {v.word} {reading && <small className="reading">{v.reading}</small>}
                  </h3>
                  <p className="entry-meaning">{v.meaning}</p>
                </div>
                <SpeakButton text={v.reading} label="读词" />
              </div>
              {v.usage && <p className="entry-note">{v.usage}</p>}
              {!!v.collocations?.length && (
                <p className="collocations">
                  <span>常用搭配</span>
                  {v.collocations.join(" · ")}
                </p>
              )}
              <Examples items={v.examples} showZh={showZh} />
              {sourceLink(v.source)}
            </div>
          )),
        )}
      {!!lesson.expressions?.length &&
        section(
          "expressions",
          "本课固定句型",
          lesson.expressions.map((e, i) => (
            <div className="entry rule-entry" key={e.id}>
              <div className="rule-heading">
                <span className="entry-number">句型 {String(i + 1).padStart(2, "0")}</span>
                <h3 lang="ja">{e.pattern}</h3>
                <p className="entry-meaning">{e.meaning}</p>
                <p className="entry-note">
                  {e.function} · 适用：{e.audience}
                </p>
              </div>
              <div className="rule-body">
                {e.notes.map((n) => (
                  <p key={n}>{n}</p>
                ))}
                {e.slots.map((s) => (
                  <p key={s.key}>
                    {s.key}：{s.description}
                  </p>
                ))}
                <Examples items={e.examples} showZh={showZh} />
                {sourceLink(e.source)}
              </div>
            </div>
          )),
        )}
      {!!lesson.grammar?.length &&
        section(
          "grammar",
          "本课文法",
          lesson.grammar.map((g, i) => (
            <div className="entry rule-entry" key={g.id}>
              <div className="rule-heading">
                <span className="entry-number">
                  文法 {String(i + 1).padStart(2, "0")}
                  {g.level ? ` · ${g.level}` : ""}
                </span>
                <h3 lang="ja">{g.pattern}</h3>
                <p className="entry-meaning">{g.meaning}</p>
                <p className="entry-note">接续：{g.connection}</p>
              </div>
              <div className="rule-body">
                {g.notes.map((n) => (
                  <p key={n}>{n}</p>
                ))}
                <Examples items={g.examples} showZh={showZh} />
              </div>
            </div>
          )),
        )}
      {!!lesson.homework?.length &&
        section(
          "homework",
          "课后作业与参考答案",
          lesson.homework.map((h) => (
            <div className="entry homework-entry" key={h.id}>
              <h3>{h.type === "oral" ? "口头任务" : "书面任务"}</h3>
              <p>{h.situation}</p>
              {(
                [
                  ["已知信息", h.knownInformation],
                  ["任务", h.tasks],
                  ["要求", h.requirements],
                  ["提示", h.hints],
                ] as const
              )
                .filter(([, a]) => a.length)
                .map(([title, values]) => (
                  <div key={title}>
                    <h4>{title}</h4>
                    <ul>
                      {values.map((v) => (
                        <li key={v}>{v}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              {h.functions?.length && (
                <p>
                  沟通功能：
                  {h.functions
                    .map((f) => ({ report: "报告", contact: "联络", consult: "相谈" })[f])
                    .join("、")}
                </p>
              )}
              {h.type === "written" && (
                <label>
                  个人草稿（仅保存在本设备）
                  <textarea
                    value={record.drafts[h.id] ?? ""}
                    onChange={(e) =>
                      setRecord((r) => ({ ...r, drafts: { ...r.drafts, [h.id]: e.target.value } }))
                    }
                  />
                </label>
              )}
              <details>
                <summary>查看参考答案</summary>
                {h.answers.map((a, i) => (
                  <div className="material-paragraph" key={i}>
                    <p lang="ja">{a.ja}</p>
                    {showZh && a.zh && <p className="translation">{a.zh}</p>}
                    {h.type === "oral" && <SpeakButton text={a.ttsText ?? a.ja} />}
                  </div>
                ))}
              </details>
            </div>
          )),
        )}
      {!!lesson.references?.length && (
        <aside>
          <h2>来源与说明</h2>
          {lesson.references.map((r, i) => (
            <p key={i}>
              {r.url ? (
                <a href={r.url} rel="noreferrer">
                  {r.title}
                </a>
              ) : (
                r.title
              )}{" "}
              {r.note}
            </p>
          ))}
        </aside>
      )}
      <nav className="controls">
        {previous && <a href={href(`/courses/${course.id}/${previous}/`)}>← 上一课</a>}
        <a href={href(`/courses/${course.id}/`)}>课程目录</a>
        {next && <a href={href(`/courses/${course.id}/${next}/`)}>下一课 →</a>}
      </nav>
    </article>
  );
}
