"use client";
import {useEffect, useRef, useState} from "react";
import type {Course, Lesson} from "../domain/content";
import {dialogueSegmentId, isDialogueLineActive} from "../application/dialogue-playback";
import {learning} from "../../../bootstrap/learning";
import {createEmptyStudyRecord, mergeStudyRecord, type StudyRecord,} from "../../learning/domain/study-record";
import {AudioControls, SpeakButton, SpeechStatus, VoiceSettings,} from "../../speech/presentation/speech-controls";
import {useSpeech} from "../../speech/presentation/speech-provider";
import {href} from "../../../shared/paths";

type Example = { ja: string; zh?: string; ttsText?: string };

function Examples({items, showZh}: { items: Example[]; showZh: boolean }) {
    return (
        <>
            {items.map((example, exampleIndex) => (
                <div className="example-line" key={exampleIndex}>
                    <div>
                        <p lang="ja">{example.ja}</p>
                        {showZh && example.zh && <p className="translation">{example.zh}</p>}
                    </div>
                    <SpeakButton text={example.ttsText ?? example.ja} label="播放例句"/>
                </div>
            ))}
        </>
    );
}

export function LessonView({
                               course,
                               lesson,
                               previousLessonId,
                               nextLessonId,
                           }: {
    course: Course;
    lesson: Lesson;
    previousLessonId?: string;
    nextLessonId?: string;
}) {
    const speech = useSpeech();
    const runtime = speech?.runtime;
    const [record, setRecord] = useState(createEmptyStudyRecord);
    const [loaded, setLoaded] = useState(false);
    const [saveFailed, setSaveFailed] = useState(false);
    const recordRef = useRef(record);
    const savedRecordRef = useRef<StudyRecord | undefined>(undefined);
    const updateRecord = (edit: (currentRecord: StudyRecord) => StudyRecord) => {
        const editedRecord = edit(recordRef.current);
        const saved = learning.save(course.id, lesson.id, editedRecord, savedRecordRef.current);
        setSaveFailed(!saved);
        const currentRecord = saved ? learning.load(course.id, lesson.id) : editedRecord;
        if (saved) savedRecordRef.current = currentRecord;
        recordRef.current = currentRecord;
        setRecord(currentRecord);
    };
    const sectionLinks = [
        {id: "objectives", title: "目标", available: !!lesson.objectives.length},
        {
            id: "text",
            title: "听读",
            available: !!(
                lesson.scene ||
                lesson.dialogues?.some((dialogue) => dialogue.lines.length) ||
                lesson.materials?.length
            ),
        },
        {id: "vocabulary", title: "词汇", available: !!lesson.vocabulary?.length},
        {id: "expressions", title: "句型", available: !!lesson.expressions?.length},
        {
            id: "grammar",
            title: "文法",
            available: !!lesson.grammar?.length,
        },
        {id: "homework", title: "作业", available: !!lesson.homework?.length},
    ].filter((item) => item.available);
    const [activeSection, setActiveSection] = useState(
        sectionLinks.find((item) => item.id === "text")?.id ?? sectionLinks[0]?.id ?? "",
    );
    const [showZh, setShowZh] = useState(true),
        [showReading, setShowReading] = useState(false),
        [dialogueId, setDialogueId] = useState(lesson.dialogues?.[0]?.id ?? ""),
        [selectedLineIds, setSelectedLineIds] = useState<string[]>([]),
        [loop, setLoop] = useState(false);
    useEffect(() => {
        const refreshRecord = () => {
            const storedRecord = learning.load(course.id, lesson.id);
            const mergedRecord = mergeStudyRecord(
                storedRecord,
                recordRef.current,
                savedRecordRef.current ?? recordRef.current,
            );
            savedRecordRef.current = storedRecord;
            recordRef.current = mergedRecord;
            setRecord(mergedRecord);
            setLoaded(true);
        };
        refreshRecord();
        return learning.subscribe(course.id, lesson.id, refreshRecord);
    }, [course.id, lesson.id]);
    useEffect(() => () => runtime?.queue.stop(), [runtime]);
    const dialogue = lesson.dialogues?.find((dialogue) => dialogue.id === dialogueId);
    const learner = lesson.speakers?.find((speaker) => speaker.id === lesson.learnerSpeakerId);
    const speakerVoiceKey = (id: string) => `${course.id}:${lesson.id}:${id}`;
    const toSpeechSegment = (
        line: NonNullable<Lesson["dialogues"]>[number]["lines"][number],
        sourceDialogueId = dialogueId,
    ) => ({
        id: dialogueSegmentId(course.id, lesson.id, sourceDialogueId, line.id),
        text: line.ttsText ?? line.ja,
        speakerId: speakerVoiceKey(line.speakerId),
        voice: lesson.speakers?.find((speaker) => speaker.id === line.speakerId)?.voice,
    });
    const lines = dialogue?.lines ?? [];
    const playbackSegments = lines
        .filter((line) => !selectedLineIds.length || selectedLineIds.includes(line.id))
        .map((line) => toSpeechSegment(line));
    const openSection = (id: string) => {
        id = sectionLinks.find((item) => item.id === id)?.id ?? sectionLinks[0]?.id ?? "";
        runtime?.queue.stop();
        setActiveSection(id);
        updateRecord((currentRecord) => ({...currentRecord, position: id}));
        requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({block: "start"}));
    };
    const renderSection = (id: string, title: string, children: React.ReactNode) => (
        <section
            id={id}
            hidden={activeSection !== id}
            onFocus={() => updateRecord((currentRecord) => ({...currentRecord, position: id}))}
        >
            <p className="eyebrow">
                {String(sectionLinks.findIndex((item) => item.id === id) + 1).padStart(2, "0")} /{" "}
                {sectionLinks.find((item) => item.id === id)?.title}
            </p>
            <h2>{title}</h2>
            {children}
        </section>
    );
    const renderSourceButton = (source: { dialogueId: string; lineId: string } | undefined) =>
        source && (
            <button
                onClick={() => {
                    runtime?.queue.stop();
                    setDialogueId(source.dialogueId);
                    setSelectedLineIds([source.lineId]);
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
                    disabled={!loaded}
                    onClick={() =>
                        updateRecord((currentRecord) => ({
                            ...currentRecord,
                            bookmarked: !currentRecord.bookmarked,
                        }))
                    }
                >
                    {record.bookmarked ? "已收藏" : "收藏"}
                </button>
                <button
                    aria-pressed={record.completed}
                    disabled={!loaded}
                    onClick={() =>
                        updateRecord((currentRecord) => ({
                            ...currentRecord,
                            completed: !currentRecord.completed,
                        }))
                    }
                >
                    {record.completed ? "已学过 ✓" : "标记学过"}
                </button>
                <label>
                    <input
                        type="checkbox"
                        checked={showZh}
                        onChange={(event) => setShowZh(event.target.checked)}
                    />
                    显示中文
                </label>
                <label>
                    <input
                        type="checkbox"
                        checked={showReading}
                        onChange={(event) => setShowReading(event.target.checked)}
                    />
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
            <VoiceSettings
                roles={lesson.speakers?.map((speaker) => ({
                    id: speakerVoiceKey(speaker.id),
                    name: speaker.name,
                }))}
            />
            <SpeechStatus/>
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
                renderSection(
                    "objectives",
                    "当前课程目标",
                    <ul className="objective-list">
                        {lesson.objectives.map((objective) => (
                            <li key={objective}>{objective}</li>
                        ))}
                    </ul>,
                )}
            {(lesson.scene || lines.length > 0 || lesson.materials?.length) &&
                renderSection(
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
                                    {lesson.scene.tasks.map((task) => (
                                        <li key={task}>{task}</li>
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
                                        onChange={(event) => {
                                            runtime?.queue.stop();
                                            setDialogueId(event.target.value);
                                            setSelectedLineIds([]);
                                        }}
                                    >
                                        {lesson.dialogues.map((dialogue) => (
                                            <option key={dialogue.id} value={dialogue.id}>
                                                {dialogue.title}（
                                                {
                                                    {main: "主课文", branch: "场景分支", register: "语体版本"}[
                                                        dialogue.variant
                                                        ]
                                                }
                                                ）
                                            </option>
                                        ))}
                                    </select>
                                </label>
                                <AudioControls
                                    items={playbackSegments}
                                    loop={loop}
                                    onLoop={(value) => {
                                        setLoop(value);
                                        runtime?.queue.setLoop(value);
                                    }}
                                />
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
                                            title={
                                                lesson.speakers?.find((speaker) => speaker.id === line.speakerId)?.role
                                            }
                                        >
                                            <input
                                                type="checkbox"
                                                aria-label={`选择 ${line.id}`}
                                                checked={selectedLineIds.includes(line.id)}
                                                onChange={(event) =>
                                                    setSelectedLineIds((lineIds) =>
                                                        event.target.checked
                                                            ? [...lineIds, line.id]
                                                            : lineIds.filter((id) => id !== line.id),
                                                    )
                                                }
                                            />
                                            <span>
                        {lesson.speakers?.find((speaker) => speaker.id === line.speakerId)?.name}
                      </span>
                                            <small>{String(i + 1).padStart(2, "0")}</small>
                                        </label>
                                        <button
                                            className="dialogue-sentence"
                                            aria-label={`逐句播放 ${i + 1}`}
                                            onClick={() => void runtime?.queue.play([toSpeechSegment(line)])}
                                        >
                                            <span lang="ja">{line.ja}</span>
                                            {showReading && line.reading && (
                                                <span className="reading">{line.reading}</span>
                                            )}
                                            {showZh && <span className="translation">{line.zh}</span>}
                                            <span className="sentence-play">▷ 播放这句</span>
                                        </button>
                                    </div>
                                ))}
                            </>
                        )}
                        {lesson.materials?.map((material) => (
                            <div className="material" key={material.id}>
                                <h3>{material.title}</h3>
                                {material.blocks.map((block, i) =>
                                    block.type === "paragraph" ? (
                                        <div className="material-paragraph" key={i}>
                                            {block.hideTranscript ? (
                                                <details>
                                                    <summary>查看听力原文</summary>
                                                    <p lang="ja">{block.ja}</p>
                                                    {showReading && block.reading && (
                                                        <p className="reading">{block.reading}</p>
                                                    )}
                                                    {showZh && block.zh && <p className="translation">{block.zh}</p>}
                                                </details>
                                            ) : (
                                                <>
                                                    <p lang="ja">{block.ja}</p>
                                                    {showReading && block.reading && (
                                                        <p className="reading">{block.reading}</p>
                                                    )}
                                                    {showZh && block.zh && <p className="translation">{block.zh}</p>}
                                                </>
                                            )}
                                            <SpeakButton
                                                text={block.ttsText ?? block.ja}
                                                label={block.hideTranscript ? "播放听力" : "朗读"}
                                            />
                                        </div>
                                    ) : block.type === "list" ? (
                                        <ul key={i}>
                                            {block.items.map((item, itemIndex) => (
                                                <li key={itemIndex}>
                                                    <Examples items={[item]} showZh={showZh}/>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <div className="table-scroll" key={i}>
                                            <table>
                                                <thead>
                                                <tr>
                                                    {block.headers.map((header, columnIndex) => (
                                                        <th key={columnIndex}>{header}</th>
                                                    ))}
                                                </tr>
                                                </thead>
                                                <tbody>
                                                {block.rows.map((row, rowIndex) => (
                                                    <tr key={rowIndex}>
                                                        {row.map((cell, columnIndex) => (
                                                            <td key={columnIndex}>{cell}</td>
                                                        ))}
                                                    </tr>
                                                ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    ),
                                )}
                                {material.asset && (
                                    <a href={href(`/course-assets/${course.id}/${material.asset.slice(7)}`)}>
                                        查看关联素材
                                    </a>
                                )}
                            </div>
                        ))}
                        {!!lesson.shadowing?.length && (
                            <div>
                                <h3>听后跟读与影子跟读</h3>
                                <p>
                                    听后跟读：先听一句，暂停后模仿。影子跟读：熟悉意思后，播放原句并稍晚同步跟读；可降低语速和循环片段。
                                </p>
                                {lesson.shadowing.map((practice) => (
                                    <div className="practice-entry" key={practice.id}>
                                        <p>{practice.prompt}</p>
                                        <button
                                            onClick={() => {
                                                const sourceDialogue = lesson.dialogues?.find(
                                                    (sourceDialogue) => sourceDialogue.id === practice.dialogueId,
                                                );
                                                setDialogueId(practice.dialogueId);
                                                setSelectedLineIds(practice.lineIds ?? []);
                                                void runtime?.queue.play(
                                                    (sourceDialogue?.lines ?? [])
                                                        .filter(
                                                            (line) =>
                                                                !practice.lineIds?.length || practice.lineIds.includes(line.id),
                                                        )
                                                        .map((line) => toSpeechSegment(line, practice.dialogueId)),
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
                renderSection(
                    "vocabulary",
                    "本课词汇",
                    lesson.vocabulary.map((entry) => (
                        <div className="entry vocabulary-entry" key={entry.id}>
                            <div className="entry-heading">
                                <div>
                                    <h3 lang="ja">
                                        {entry.word} {showReading && <small className="reading">{entry.reading}</small>}
                                    </h3>
                                    <p className="entry-meaning">{entry.meaning}</p>
                                </div>
                                <SpeakButton text={entry.reading} label="读词"/>
                            </div>
                            {entry.usage && <p className="entry-note">{entry.usage}</p>}
                            {!!entry.collocations?.length && (
                                <p className="collocations">
                                    <span>常用搭配</span>
                                    {entry.collocations.join(" · ")}
                                </p>
                            )}
                            <Examples items={entry.examples} showZh={showZh}/>
                            {renderSourceButton(entry.source)}
                        </div>
                    )),
                )}
            {!!lesson.expressions?.length &&
                renderSection(
                    "expressions",
                    "本课固定句型",
                    lesson.expressions.map((expression, i) => (
                        <div className="entry rule-entry" key={expression.id}>
                            <div className="rule-heading">
                                <span className="entry-number">句型 {String(i + 1).padStart(2, "0")}</span>
                                <h3 lang="ja">{expression.pattern}</h3>
                                <p className="entry-meaning">{expression.meaning}</p>
                                <p className="entry-note">
                                    {expression.function} · 适用：{expression.audience}
                                </p>
                            </div>
                            <div className="rule-body">
                                {expression.notes.map((note) => (
                                    <p key={note}>{note}</p>
                                ))}
                                {expression.slots.map((slot) => (
                                    <p key={slot.key}>
                                        {slot.key}：{slot.description}
                                    </p>
                                ))}
                                <Examples items={expression.examples} showZh={showZh}/>
                                {renderSourceButton(expression.source)}
                            </div>
                        </div>
                    )),
                )}
            {!!lesson.grammar?.length &&
                renderSection(
                    "grammar",
                    "本课文法",
                    lesson.grammar.map((grammar, i) => (
                        <div className="entry rule-entry" key={grammar.id}>
                            <div className="rule-heading">
                <span className="entry-number">
                  文法 {String(i + 1).padStart(2, "0")}
                    {grammar.level ? ` · ${grammar.level}` : ""}
                </span>
                                <h3 lang="ja">{grammar.pattern}</h3>
                                <p className="entry-meaning">{grammar.meaning}</p>
                                <p className="entry-note">接续：{grammar.connection}</p>
                            </div>
                            <div className="rule-body">
                                {grammar.notes.map((note) => (
                                    <p key={note}>{note}</p>
                                ))}
                                <Examples items={grammar.examples} showZh={showZh}/>
                            </div>
                        </div>
                    )),
                )}
            {!!lesson.homework?.length &&
                renderSection(
                    "homework",
                    "课后作业与参考答案",
                    lesson.homework.map((homework) => (
                        <div className="entry homework-entry" key={homework.id}>
                            <h3>{homework.type === "oral" ? "口头任务" : "书面任务"}</h3>
                            <p>{homework.situation}</p>
                            {(
                                [
                                    ["已知信息", homework.knownInformation],
                                    ["任务", homework.tasks],
                                    ["要求", homework.requirements],
                                    ["提示", homework.hints],
                                ] as const
                            )
                                .filter(([, values]) => values.length)
                                .map(([title, values]) => (
                                    <div key={title}>
                                        <h4>{title}</h4>
                                        <ul>
                                            {values.map((value) => (
                                                <li key={value}>{value}</li>
                                            ))}
                                        </ul>
                                    </div>
                                ))}
                            {!!homework.functions?.length && (
                                <p>
                                    沟通功能：
                                    {homework.functions
                                        .map(
                                            (communicationFunction) =>
                                                ({report: "报告", contact: "联络", consult: "相谈"})[
                                                    communicationFunction
                                                    ],
                                        )
                                        .join("、")}
                                </p>
                            )}
                            {homework.type === "written" && (
                                <label>
                                    个人草稿（仅保存在本设备）
                                    <textarea
                                        disabled={!loaded}
                                        value={
                                            Object.hasOwn(record.drafts, homework.id) ? record.drafts[homework.id] : ""
                                        }
                                        onChange={(event) =>
                                            updateRecord((currentRecord) => ({
                                                ...currentRecord,
                                                drafts: {...currentRecord.drafts, [homework.id]: event.target.value},
                                            }))
                                        }
                                    />
                                </label>
                            )}
                            <details>
                                <summary>查看参考答案</summary>
                                {homework.answers.map((answer, i) => (
                                    <div className="material-paragraph" key={i}>
                                        <p lang="ja">{answer.ja}</p>
                                        {showZh && answer.zh && <p className="translation">{answer.zh}</p>}
                                        {homework.type === "oral" && <SpeakButton text={answer.ttsText ?? answer.ja}/>}
                                    </div>
                                ))}
                            </details>
                        </div>
                    )),
                )}
            {!!lesson.references?.length && (
                <aside>
                    <h2>来源与说明</h2>
                    {lesson.references.map((reference, i) => (
                        <p key={i}>
                            {reference.url ? (
                                <a href={reference.url} rel="noreferrer">
                                    {reference.title}
                                </a>
                            ) : (
                                reference.title
                            )}{" "}
                            {reference.note}
                        </p>
                    ))}
                </aside>
            )}
            <nav className="controls">
                {previousLessonId && (
                    <a href={href(`/courses/${course.id}/${previousLessonId}/`)}>← 上一课</a>
                )}
                <a href={href(`/courses/${course.id}/`)}>课程目录</a>
                {nextLessonId && <a href={href(`/courses/${course.id}/${nextLessonId}/`)}>下一课 →</a>}
            </nav>
        </article>
    );
}
