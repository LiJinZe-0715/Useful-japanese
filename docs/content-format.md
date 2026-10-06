# 日语学习内容格式 v1

本指南是唯一说明来源，网站 /guide/ 直接展示此文件。机器契约为 schemas/*.schema.json；TypeScript 类型由这些 Schema 生成。标准 UTF-8 JSON，不允许注释、尾逗号、HTML、JSX、函数或 CSS 类名。未知字段拒绝。schemaVersion 必须是数字 1。

## 文件结构

```text
data/courses/<courseId>/course.json
data/courses/<courseId>/lessons/<chapterId>/<sectionFile>.json
# 例如 life/lessons/pre/pre-hiragana.json、life/lessons/n5/n5-1.json
data/courses/<courseId>/assets/  # 可选
schemas/course.schema.json
schemas/lesson.schema.json
docs/examples/course-package/example-business/  # 有效示例，不发布
tests/fixtures/courses/  # 测试夹具，不发布
```

正式发现目录只接受独立课程文件夹；缺 course.json 是错误。lessons 自动发现一层章节目录内的 .json，也兼容已有直接放在 lessons 下的 .json。章节目录名必须在 course.units 声明，并与课件 unitId 相同；不支持更深层嵌套。目录为空是有效状态。停用课程仍必须通过校验，但不产生首页入口或路由。目录中放 .gitkeep 不会被发现。

## 完整有效示范包

以下为结构示范，非正式课程。可运行 pnpm validate:content 验证 docs/examples 中的原文件。

course.json：

```json
{
  "schemaVersion": 1,
  "id": "example-business",
  "title": "格式示范（非正式课程）",
  "description": "只用于说明数据契约",
  "learningMode": "business",
  "order": 10,
  "enabled": true,
  "levels": [],
  "units": [
    {
      "id": "unit-one",
      "title": "示范单元",
      "order": 1
    }
  ]
}
```

lessons/example-scene.json：

```json
{
  "schemaVersion": 1,
  "id": "example-scene",
  "unitId": "unit-one",
  "order": 1,
  "title": "结构示范",
  "kind": "scene",
  "objectives": ["了解示例格式"],
  "scene": {
    "background": "格式演示",
    "channel": "meeting",
    "tasks": ["说明安排"],
    "relationships": "同事"
  },
  "learnerSpeakerId": "a",
  "speakers": [
    {
      "id": "a",
      "name": "我（わたし）",
      "role": "你扮演的学习者，同事身份",
      "voice": {
        "voicevoxStyleId": 3
      }
    }
  ],
  "dialogues": [
    {
      "id": "main",
      "title": "主课文",
      "variant": "main",
      "lines": [
        {
          "id": "line-one",
          "speakerId": "a",
          "ja": "確認します。",
          "zh": "我确认一下。",
          "reading": "かくにんします。"
        }
      ]
    }
  ],
  "materials": [
    {
      "id": "note",
      "title": "说明",
      "kind": "explanation",
      "blocks": [
        {
          "type": "paragraph",
          "ja": "例です。",
          "zh": "这是示例。"
        }
      ]
    }
  ],
  "vocabulary": [
    {
      "id": "confirm",
      "word": "確認",
      "reading": "かくにん",
      "meaning": "确认",
      "usage": "确认安排",
      "collocations": ["確認する"],
      "examples": [
        {
          "ja": "確認します。",
          "zh": "我确认一下。"
        }
      ],
      "source": {
        "dialogueId": "main",
        "lineId": "line-one"
      }
    }
  ],
  "expressions": [
    {
      "id": "expression-one",
      "function": "联络",
      "pattern": "〜します",
      "meaning": "将做某事",
      "audience": "同事",
      "notes": ["格式示例"],
      "slots": [
        {
          "key": "〜",
          "description": "动作"
        }
      ],
      "examples": [
        {
          "ja": "確認します。",
          "zh": "我确认一下。"
        }
      ]
    }
  ],
  "grammar": [],
  "shadowing": [
    {
      "id": "practice-one",
      "dialogueId": "main",
      "lineIds": ["line-one"],
      "prompt": "先听后跟读，再同步影子跟读。"
    }
  ],
  "homework": [
    {
      "id": "task-one",
      "type": "oral",
      "situation": "说明下一步",
      "knownInformation": ["需要确认"],
      "tasks": ["说出安排"],
      "requirements": ["简洁"],
      "hints": ["参考固定表达"],
      "functions": ["contact"],
      "answers": [
        {
          "ja": "確認します。",
          "zh": "我确认一下。"
        }
      ]
    }
  ],
  "references": [
    {
      "title": "自编格式示范",
      "note": "不作为正式课程内容发布"
    }
  ]
}
```

## 字段契约

以下路径 [] 表示数组元素。未出现的可选字段默认不展示；可选数组省略等价于 []，但不会改写源数据。所有数组可以为空，例外：life 的 course.levels、scene 的 dialogues、preparation 的 materials、每道 homework.answers 必须非空；包含对话时，必须用 learnerSpeakerId 引用同课 speakers 中唯一的学习者角色，每组 dialogues[].lines 必须有该角色的台词。scene 必须有 scene 对象。life 的 scene 课件必须有 level，且属于课程 levels。准备篇与 N5、N4、N3、N2 是并列章节；通用假名与基础发音准备课件不属于任何 JLPT 等级，应省略 level。其他课件若声明 level，也必须属于课程 levels。无需强制每课拥有五种内容：空区块直接隐藏。

所有 ID 为小写字母起始的 kebab-case。order 为非负整数。课程和课次按 order 升序，再按 ID 的代码点顺序稳定排序；单元按 order、ID 排序，课次的主序仍是 lesson.order。数组内部顺序由作者给定，不自动改排对话句子。

chapter 对应 course.units，section 对应一份课件 JSON。推荐按章节放文件：lessons/pre/pre-hiragana.json 的 id=hiragana、unitId=pre；lessons/n5/n5-1.json 的 id=n5-1、unitId=n5。课件 id 可以等于文件名去掉 .json；兼容旧编号文件（如 n5/1.json 对应 n5-1），也允许文件名为章节 ID 加连字符和稳定课件 ID（如 pre/pre-hiragana.json 对应 hiragana）；id 保持全课程唯一。新文件推荐使用目录前缀，如 n5-1.json、n5-2.json、n5-10.json；旧编号文件仍兼容，但排序使用 order，不按文件名排序。移动文件不改变课件 id，访问路由和学习记录仍使用 /courses/<courseId>/<lessonId>/。准备篇 pre 与 n5、n4、n3、n2 并列，不因在同一个生活课程包内而属于 N5。

### 课程

| 字段          | 类型 / 允许值           | 必填   | 限制                                 |
| ------------- | ----------------------- | ------ | ------------------------------------ |
| schemaVersion | 1                       | 必填   |                                      |
| id            | string                  | 必填   | 格式 ^[a-z][a-z0-9]_(?:-[a-z0-9]+)_$ |
| title         | string                  | 必填   | 非空字符串                           |
| description   | string                  | 必填   | 非空字符串                           |
| learningMode  | business / life         | 必填   |                                      |
| order         | integer                 | 必填   | 最小 0                               |
| enabled       | boolean                 | 必填   |                                      |
| levels        | 数组<N5 / N4 / N3 / N2> | 必填   |                                      |
| units         | 数组<object>            | 可省略 |                                      |
| units[].id    | string                  | 必填   | 格式 ^[a-z][a-z0-9]_(?:-[a-z0-9]+)_$ |
| units[].title | string                  | 必填   | 非空字符串                           |
| units[].order | integer                 | 必填   | 最小 0                               |

business 可用于商务、财务审计、法律、IT 等，行业由标题、描述、场景区分，不设行业 ID 枚举。business 的 levels 可为空；life 支持 N5、N4、N3、N2，可声明多个等级。units 可省略或为空；各单元 id 在本课程内唯一。

### 学习者角色（所有日语课程通用）

凡课件包含对话，必须声明 learnerSpeakerId，引用同课 speakers 中已有角色的 id。主课文、条件分支、不同语体等每一组对话都必须有该角色的实际台词；仅声明一个不说话的角色不能通过校验。当前正式课程统一显示“我（わたし）”，但 name 只是显示名称，改名、同名角色和数组顺序不改变学习者身份。role 说明学习者在当前场景中的身份，例如顾客、新人或项目负责人。课文里的林（リン）等示例姓名可以保留，并在角色说明中明确是学习者扮演的情境姓名。

已有 speaker.id 应保持不变，使台词引用、角色声音设置继续有效。页面按 learnerSpeakerId 标记学习者台词；它不进入课程目录摘要。只有假名、发音或说明材料且没有对话的准备课可省略此字段，不需要虚构对话角色。如果提供此字段，引用也必须有效。

### 课件及嵌套字段

| 字段                                 | 类型 / 允许值                                                | 必填         | 限制                                 |
| ------------------------------------ | ------------------------------------------------------------ | ------------ | ------------------------------------ |
| schemaVersion                        | 1                                                            | 必填         |                                      |
| id                                   | string                                                       | 必填         | 格式 ^[a-z][a-z0-9]_(?:-[a-z0-9]+)_$ |
| unitId                               | string                                                       | 可省略       | 格式 ^[a-z][a-z0-9]_(?:-[a-z0-9]+)_$ |
| order                                | integer                                                      | 必填         | 最小 0                               |
| title                                | string                                                       | 必填         | 非空字符串                           |
| level                                | N5 / N4 / N3 / N2                                            | 可省略       |                                      |
| kind                                 | scene / preparation                                          | 必填         |                                      |
| objectives                           | 数组<string>                                                 | 必填         |                                      |
| scene                                | object                                                       | 可省略       |                                      |
| scene.background                     | string                                                       | 必填         | 非空字符串                           |
| scene.channel                        | in-person / phone / meeting / email / chat / other           | 必填         |                                      |
| scene.tasks                          | 数组<string>                                                 | 必填         |                                      |
| scene.relationships                  | string                                                       | 必填         | 非空字符串                           |
| learnerSpeakerId                     | string                                                       | 有对话时必填 | 引用同课 speakers[].id               |
| speakers                             | 数组<object>                                                 | 可省略       |                                      |
| speakers[].id                        | string                                                       | 必填         | 格式 ^[a-z][a-z0-9]_(?:-[a-z0-9]+)_$ |
| speakers[].name                      | string                                                       | 必填         | 非空字符串                           |
| speakers[].role                      | string                                                       | 必填         | 非空字符串                           |
| speakers[].voice                     | object                                                       | 可省略       |                                      |
| speakers[].voice.browserVoiceURI     | string                                                       | 可省略       | 非空字符串                           |
| speakers[].voice.voicevoxStyleId     | integer                                                      | 可省略       | 最小 0                               |
| dialogues                            | 数组<object>                                                 | 可省略       |                                      |
| dialogues[].id                       | string                                                       | 必填         | 格式 ^[a-z][a-z0-9]_(?:-[a-z0-9]+)_$ |
| dialogues[].title                    | string                                                       | 必填         | 非空字符串                           |
| dialogues[].variant                  | main / branch / register                                     | 必填         |                                      |
| dialogues[].lines                    | 数组<object>                                                 | 必填         |                                      |
| dialogues[].lines[].id               | string                                                       | 必填         | 格式 ^[a-z][a-z0-9]_(?:-[a-z0-9]+)_$ |
| dialogues[].lines[].speakerId        | string                                                       | 必填         | 格式 ^[a-z][a-z0-9]_(?:-[a-z0-9]+)_$ |
| dialogues[].lines[].ja               | string                                                       | 必填         | 非空字符串                           |
| dialogues[].lines[].zh               | string                                                       | 必填         | 非空字符串                           |
| dialogues[].lines[].reading          | string                                                       | 可省略       | 非空字符串                           |
| dialogues[].lines[].ttsText          | string                                                       | 可省略       | 非空字符串                           |
| materials                            | 数组<object>                                                 | 可省略       |                                      |
| materials[].id                       | string                                                       | 必填         | 格式 ^[a-z][a-z0-9]_(?:-[a-z0-9]+)_$ |
| materials[].title                    | string                                                       | 必填         | 非空字符串                           |
| materials[].kind                     | email / message / explanation / list / table / pronunciation | 必填         |                                      |
| materials[].blocks                   | 数组<paragraph / list / table>                               | 必填         |                                      |
| materials[].blocks[].type            | paragraph                                                    | 必填         |                                      |
| materials[].blocks[].ja              | string                                                       | 必填         | 非空字符串                           |
| materials[].blocks[].zh              | string                                                       | 可省略       | 非空字符串                           |
| materials[].blocks[].reading         | string                                                       | 可省略       | 非空字符串                           |
| materials[].blocks[].ttsText         | string                                                       | 可省略       | 非空字符串                           |
| materials[].blocks[].type            | list                                                         | 必填         |                                      |
| materials[].blocks[].items           | 数组<object>                                                 | 必填         |                                      |
| materials[].blocks[].items[].ja      | string                                                       | 必填         | 非空字符串                           |
| materials[].blocks[].items[].zh      | string                                                       | 必填         | 非空字符串                           |
| materials[].blocks[].items[].ttsText | string                                                       | 可省略       | 非空字符串                           |
| materials[].blocks[].type            | table                                                        | 必填         |                                      |
| materials[].blocks[].headers         | 数组<string>                                                 | 必填         |                                      |
| materials[].blocks[].rows            | 数组<数组<string>>                                           | 必填         |                                      |
| materials[].asset                    | string                                                       | 可省略       | 非空字符串                           |
| vocabulary                           | 数组<object>                                                 | 可省略       |                                      |
| vocabulary[].id                      | string                                                       | 必填         | 格式 ^[a-z][a-z0-9]_(?:-[a-z0-9]+)_$ |
| vocabulary[].word                    | string                                                       | 必填         | 非空字符串                           |
| vocabulary[].reading                 | string                                                       | 必填         | 非空字符串                           |
| vocabulary[].meaning                 | string                                                       | 必填         | 非空字符串                           |
| vocabulary[].usage                   | string                                                       | 可省略       | 非空字符串                           |
| vocabulary[].collocations            | 数组<string>                                                 | 可省略       |                                      |
| vocabulary[].examples                | 数组<object>                                                 | 必填         |                                      |
| vocabulary[].examples[].ja           | string                                                       | 必填         | 非空字符串                           |
| vocabulary[].examples[].zh           | string                                                       | 必填         | 非空字符串                           |
| vocabulary[].examples[].ttsText      | string                                                       | 可省略       | 非空字符串                           |
| vocabulary[].source                  | object                                                       | 可省略       |                                      |
| vocabulary[].source.dialogueId       | string                                                       | 必填         | 格式 ^[a-z][a-z0-9]_(?:-[a-z0-9]+)_$ |
| vocabulary[].source.lineId           | string                                                       | 必填         | 格式 ^[a-z][a-z0-9]_(?:-[a-z0-9]+)_$ |
| expressions                          | 数组<object>                                                 | 可省略       |                                      |
| expressions[].id                     | string                                                       | 必填         | 格式 ^[a-z][a-z0-9]_(?:-[a-z0-9]+)_$ |
| expressions[].function               | string                                                       | 必填         | 非空字符串                           |
| expressions[].pattern                | string                                                       | 必填         | 非空字符串                           |
| expressions[].meaning                | string                                                       | 必填         | 非空字符串                           |
| expressions[].audience               | string                                                       | 必填         | 非空字符串                           |
| expressions[].notes                  | 数组<string>                                                 | 必填         |                                      |
| expressions[].slots                  | 数组<object>                                                 | 必填         |                                      |
| expressions[].slots[].key            | string                                                       | 必填         | 非空字符串                           |
| expressions[].slots[].description    | string                                                       | 必填         | 非空字符串                           |
| expressions[].examples               | 数组<object>                                                 | 必填         |                                      |
| expressions[].examples[].ja          | string                                                       | 必填         | 非空字符串                           |
| expressions[].examples[].zh          | string                                                       | 必填         | 非空字符串                           |
| expressions[].examples[].ttsText     | string                                                       | 可省略       | 非空字符串                           |
| expressions[].source                 | object                                                       | 可省略       |                                      |
| expressions[].source.dialogueId      | string                                                       | 必填         | 格式 ^[a-z][a-z0-9]_(?:-[a-z0-9]+)_$ |
| expressions[].source.lineId          | string                                                       | 必填         | 格式 ^[a-z][a-z0-9]_(?:-[a-z0-9]+)_$ |
| grammar                              | 数组<object>                                                 | 可省略       |                                      |
| grammar[].id                         | string                                                       | 必填         | 格式 ^[a-z][a-z0-9]_(?:-[a-z0-9]+)_$ |
| grammar[].pattern                    | string                                                       | 必填         | 非空字符串                           |
| grammar[].level                      | N5 / N4 / N3 / N2                                            | 可省略       |                                      |
| grammar[].meaning                    | string                                                       | 必填         | 非空字符串                           |
| grammar[].connection                 | string                                                       | 必填         | 非空字符串                           |
| grammar[].notes                      | 数组<string>                                                 | 必填         |                                      |
| grammar[].examples                   | 数组<object>                                                 | 必填         |                                      |
| grammar[].examples[].ja              | string                                                       | 必填         | 非空字符串                           |
| grammar[].examples[].zh              | string                                                       | 必填         | 非空字符串                           |
| grammar[].examples[].ttsText         | string                                                       | 可省略       | 非空字符串                           |
| shadowing                            | 数组<object>                                                 | 可省略       |                                      |
| shadowing[].id                       | string                                                       | 必填         | 格式 ^[a-z][a-z0-9]_(?:-[a-z0-9]+)_$ |
| shadowing[].dialogueId               | string                                                       | 必填         | 格式 ^[a-z][a-z0-9]_(?:-[a-z0-9]+)_$ |
| shadowing[].lineIds                  | 数组<string>                                                 | 可省略       |                                      |
| shadowing[].prompt                   | string                                                       | 必填         | 非空字符串                           |
| homework                             | 数组<object>                                                 | 可省略       |                                      |
| homework[].id                        | string                                                       | 必填         | 格式 ^[a-z][a-z0-9]_(?:-[a-z0-9]+)_$ |
| homework[].type                      | oral / written                                               | 必填         |                                      |
| homework[].situation                 | string                                                       | 必填         | 非空字符串                           |
| homework[].knownInformation          | 数组<string>                                                 | 必填         |                                      |
| homework[].tasks                     | 数组<string>                                                 | 必填         |                                      |
| homework[].requirements              | 数组<string>                                                 | 必填         |                                      |
| homework[].hints                     | 数组<string>                                                 | 必填         |                                      |
| homework[].functions                 | 数组<report / contact / consult>                             | 可省略       |                                      |
| homework[].answers                   | 数组<object>                                                 | 必填         |                                      |
| homework[].answers[].ja              | string                                                       | 必填         | 非空字符串                           |
| homework[].answers[].zh              | string                                                       | 可省略       | 非空字符串                           |
| homework[].answers[].ttsText         | string                                                       | 可省略       | 非空字符串                           |
| references                           | 数组<object>                                                 | 可省略       |                                      |
| references[].title                   | string                                                       | 必填         | 非空字符串                           |
| references[].url                     | string                                                       | 可省略       | 格式 ^https?://                      |
| references[].note                    | string                                                       | 可省略       | 非空字符串                           |

## 内容、引用与默认行为

- id 与课程目录 / 课次文件名一致；跨课程允许相同课次 ID。人物、对话、素材、词汇、表达、文法、练习、作业 ID 各自集合内唯一；对话行 ID 在整课唯一。
- unitId 引用 course.units.id。speakerId 引用同课 speakers.id。source.dialogueId 和 source.lineId 必须引用同课对应对话中的原句。
- dialogues.variant=main 是主课文，branch 是情境分支，register 是语体版本。版本是独立对话，由页面选择器呈现。每句 ja / zh 必填；reading 仅按需显示，ttsText 覆盖朗读文本，省略则读 ja。
- shadowing 引用已有 dialogueId。lineIds 省略或 [] 表示全对话；非空则依原课文顺序读取指定句子，不复制正文。prompt 是练习提示。
- 词汇含 word、reading、meaning、examples；usage、collocations、source 可省略。表达 function 是自由文本沟通功能，pattern 为框架，audience 为适用对象，notes 为说明，slots 为可替换部分，examples 为例句。商务文法可写在表达 notes；life 的 grammar 显示独立区块。
- materials.kind 指明用途，blocks 负责结构。paragraph 用 ja、可选 zh / reading / ttsText；list 用 ja / zh 例句列表；table 用 headers 与 rows，行列数必须匹配。假名、发音准备放 pronunciation 素材；preparation 无需对话。
- asset 是相对本课程的 assets/ 文件路径，不允许 ..、绝对路径或符号链接。构建将素材复制到同源 /course-assets/<courseId>/；不要放隐私或执行代码。页面提供素材链接。素材按 material.id 标识，当前契约不设跨课素材引用。
- homework.type=oral / written，包含 situation、knownInformation、tasks、requirements、hints 和非空 answers。答案 ja 必填、zh / ttsText 可省略，可有多个。functions 可选 report / contact / consult（报告 / 联络 / 相谈）。口头答案可朗读；书面草稿只保存在设备，不提交、不批改、不评分、不比对答案。
- references.title 必填，url 若提供必须 http(s)，note 为来源说明。允许自编来源说明而不填 URL。
- speakers.voice 可分别声明 browserVoiceURI 和 voicevoxStyleId。两种标识独立；用户角色设置优先于数据，数据优先于默认声音。无效设备声音回退到可用日语声音；已检测到的 VOICEVOX 风格无效时回退到第一个可用风格。不保证每位访问者都有相同设备声音。
- 对话中文可整体隐藏；词义、场景、使用说明是学习说明，仍显示。缺失读音不自动生成假名。

## 生活和准备类示例

tests/fixtures/courses/life-demo 包含 N5 生活场景课和不分级的准备课。准备课示范如下（省略顶层 level）：

```json
{
  "schemaVersion": 1,
  "id": "preparation",
  "order": 0,
  "title": "准备结构夹具",
  "kind": "preparation",
  "objectives": [],
  "materials": [
    {
      "id": "list",
      "title": "列表",
      "kind": "pronunciation",
      "blocks": [
        {
          "type": "list",
          "items": [
            {
              "ja": "あ",
              "zh": "a"
            }
          ]
        },
        {
          "type": "table",
          "headers": ["假名", "读音"],
          "rows": [["あ", "a"]]
        }
      ]
    }
  ],
  "grammar": [
    {
      "id": "grammar-one",
      "pattern": "〜です",
      "level": "N5",
      "meaning": "是",
      "connection": "名词 + です",
      "notes": [],
      "examples": [
        {
          "ja": "学生です。",
          "zh": "是学生。"
        }
      ]
    }
  ]
}
```

## 添加与更新

1. 新增课程：建立 data/courses/<id>/，写 course.json；不要修改核心代码或生成目录。
2. 新增课次：在该包 lessons 下新增 <id>.json，填写排序与引用。新增行业继续选择 business，不改语音适配或注册表。
3. 更新内容：编辑这一份 JSON；ID 保持稳定，改 ID 会形成新的学习记录键。删除被引用句子时同时更新 source / shadowing。
4. pnpm install --frozen-lockfile；pnpm validate:content 验证正式、示例与测试包。
5. pnpm dev 后打开首页和新课程路径。开发发现新增 / 删除 / 修改文件，重新校验并刷新；错误显示文件和 JSON 字段路径。
6. pnpm typecheck、pnpm lint、pnpm format:check、pnpm test、pnpm build。排版可运行 pnpm format。
7. git add / commit 源文件、数据与素材、pnpm-lock.yaml；不要提交 node_modules、dist、src/generated 或 public/course-assets。
8. push main 后 GitHub Actions 自动验证、检查、构建与部署。首次部署在 Settings → Pages 选择 GitHub Actions。数据修改同样触发工作流，验证失败会阻止上传与发布。

## 常见错误

- JSON 尾逗号 / 注释：删除，使用标准 JSON；错误包含文件名与解析位置。
- id 与目录 / 文件名不同：统一拼写。重复 ID：为同课实体使用独立稳定 ID。
- 缺少必填字段或额外字段：依上表与 Schema 修正。空字符串不是省略字段。
- /dialogues/0/lines/0/speakerId：先声明 speakers 中对应人物。
- /shadowing/0/lineIds/0：行必须属于指定 dialogueId；不能引用另一版本的句子。
- /unitId 或 /level：先在 course.json 声明单元 / 等级。
- 表格列数不一致：每行与 headers 等长；空单元格允许用空字符串。
- 新内容不显示：确认 enabled=true、路径为 data/courses、JSON 校验通过，开发服务运行在本仓库。
- 无语音：可继续阅读。浏览器 getVoices 可能延迟到达；平台监听 voiceschanged。VOICEVOX 未连接请参阅 README 的本机连接条件。

N2 与准备篇、N5、N4、N3 为同层章节，使用 lessons/n2/n2-1.json 等路径、unitId=n2 与 level=N2。章节等级是教学编排目标，并不要求每条文法都是该等级的新项目；复习文法可省略 grammar[].level。
