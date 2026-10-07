# Nihongo 日语学习平台

日语自学网站，包含生活日语、软件开发岗位商务日语和审计商务日语。开发路线以 Java / Spring Boot 后端为主，兼顾前端协作；审计路线覆盖会计审计实务、客户沟通、内部汇报与底稿表达。对话中的学习者角色为“我（わたし）”，支持日中对照、读音、词汇、跟读、语音播放和学习记录。

| 课程             | 内容                                                                       |
| ---------------- | -------------------------------------------------------------------------- |
| 生活日语         | 208 节：准备篇 8 节，N5、N4、N3 各 20 课，N2 共 60 课，N1 共 80 课         |
| 软件开发商务日语 | 以 N3 为起点，40 课职场路线 + 6 课后端基础 + 36 课专项场景，共 23 章 82 课 |
| 审计商务日语     | 12 章，86 节主课 + 20 节补充专题，共 106 节；按原课程推荐顺序穿插专题      |

生活 N1 分为 16 组主题，每组 5 课。共 160 段对话、960 句、640 条场景词汇（596 个不同词形）、160 个文法条目、80 组长文读解和 320 道练习，覆盖住居、消费、家计、公共服务、健康沟通、防灾、教育、人际关系、数字生活、工作生活边界、文化、环境、社区、旅行、语言多样性与综合表达。完整课目及学习方法见[生活日语 N1 课程说明](docs/life-n1-curriculum.md)。N1 为综合能力目标，文法含必要复习；材料均为原创，不是官方题库。

“商务与职场词汇”页面位于 `/vocabulary/`，默认展开全部 2,129 条商务课程词汇（开发 1,204 条、审计 925 条），支持按日语、读音、中文、例句搜索以及按课程章节筛选。每条提供读音、释义、日中例句、语音播放和课文入口，有来源搭配的条目同时展示搭配；同一词在不同场景中的条目分别保留，条目数不等同于去重单词数。

审计课程完整参照相邻参考仓 `aduit-nihongo/data/course`，保留 86 个学习日和全部 20 个专题。共 644 段对话、1,616 句、925 条词汇（618 个不同词形）、176 个文法条目和 364 道练习，涵盖现场追问、客户／内部／底稿三种语体、识读、搭配、盲听、跟读和双输出。盲听原文默认折叠，点击“查看听力原文”后展开。原有 1/2/3 难度是任务阶段，不映射为 JLPT。完整课目、参考来源与学习方法见[审计商务日语课程说明](docs/audit-curriculum.md)。

专项覆盖 Java 集合、Stream、金额时间与并发，Spring 配置、验证与代理，HTTP 接口与文件，MyBatis、SQL 与迁移，事务隔离与幂等，JUnit、Mockito、MockMvc、Testcontainers，Redis、Kafka 与重试，CI/CD、Linux、网络、容器与云资源，安全，HTML/CSS、React/Vue、TypeScript，以及订单库存、账单审批和商务交期协商。

82 课均有完整对话读音、现场追问、三组固定表达，以及口头汇报、书面消息、临时追问三类作业与参考答案。新增 36 课还提供对外语体和正式邮件示范。共 210 段对话、1,476 句、246 道练习。完整覆盖表、建议路线和自测方式见[软件开发商务日语课程说明](docs/it-curriculum.md)。课程按岗位任务组织；N3 是学习起点，技术词汇不按 JLPT 定级。

使用 Node.js 22.13 或更高版本、pnpm 12.9.1。

```sh
pnpm install --frozen-lockfile
pnpm dev
```

开发地址默认为 http://localhost:3000，以终端输出为准。

课程放在 `data/courses/<courseId>/course.json` 和 `data/courses/<courseId>/lessons/<chapterId>/*.json`。新增或修改课程后会自动发现和校验，无需手写路由。课件结构、角色、素材和语音字段见[内容格式指南](docs/content-format.md)，网站的“内容指南”页面也使用这份说明。

```sh
pnpm validate:content
pnpm typecheck
pnpm lint
pnpm format:check
pnpm test
pnpm build
pnpm preview
```

`pnpm build` 生成根路径静态网站，输出到 `dist/client`；`pnpm preview` 在 http://127.0.0.1:4173 预览。

GitHub Pages 使用 `pnpm build:pages`，未设置 `PAGES_BASE_PATH` 时使用当前项目目录名作为路径（本仓为 `/Useful-japanese`）。工作流在推送 `main` 后执行检查、构建和部署，PR 执行检查与构建。首次部署在仓库 Settings → Pages 选择 GitHub Actions；项目站点默认使用仓库名作为路径。根路径站点将 Actions 仓库变量 `PAGES_BASE_PATH` 设为 `/`，其他子路径设为 `/repo`。预览子路径构建时，设置与构建相同的 `PAGES_BASE_PATH`。

语音可选择设备日语声音或 VOICEVOX。VOICEVOX 需在访问网站的设备上运行，默认地址为 `http://127.0.0.1:50021`，并允许网站 Origin 的连接；可通过 `.env.local` 中的 `VITE_VOICEVOX_URL` 修改地址，修改后重启开发服务或重新构建。在设置页检测并选择声音。

学习记录和书面草稿保存在当前浏览器的 `localStorage` 中，按课程和课次区分。

`src/generated`、`public/course-assets`、`dist`、`.vinext`、`.next` 和 `*.tsbuildinfo` 为生成物，无需提交。修改 Schema 后运行 `pnpm validate:content`，并一并提交生成的 `src/modules/catalog/domain/content.ts`。

构建依赖 `braces@3.0.3` 暂无上游修复版，项目通过 pnpm 补丁将解析与 AST 遍历深度限制为 128，以缓解 GHSA-vfj7-8cjw-p6xm。安装必须使用仓库锁文件与补丁；普通 glob 行为由回归测试验证。依赖审计仍会按版本报告该告警，不能将其视为已经升级到官方修复版。
