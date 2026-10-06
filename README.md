# Nihongo 日语学习平台

日语自学网站，包含生活日语和软件开发岗位商务日语。职场路线以 Java / Spring Boot 后端为主，兼顾前端协作。对话中的学习者角色为“我（わたし）”，支持日中对照、读音、词汇、跟读、语音播放和学习记录。

| 课程             | 内容                                                                       |
| ---------------- | -------------------------------------------------------------------------- |
| 生活日语         | 128 节：准备篇 8 节，N5、N4、N3 各 20 课，N2 共 60 课                      |
| 软件开发商务日语 | 以 N3 为起点，40 课职场路线 + 6 课后端基础 + 36 课专项场景，共 23 章 82 课 |

“开发与职场词汇”页面位于 `/vocabulary/`，默认展开全部 1,204 条职场课程词汇，支持按日语、读音、中文、例句搜索以及按章节筛选。每条提供读音、释义、搭配、日中例句、语音播放和课文入口；同一词在不同场景中的条目分别保留，条目数不等同于去重单词数。

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

GitHub Pages 使用 `pnpm build:pages`，默认路径为 `/nihongo`。工作流在推送 `main` 后执行检查、构建和部署，PR 执行检查与构建。首次部署在仓库 Settings → Pages 选择 GitHub Actions；项目站点默认使用仓库名作为路径。根路径站点将 Actions 仓库变量 `PAGES_BASE_PATH` 设为 `/`，其他子路径设为 `/repo`。预览子路径构建时，设置与构建相同的 `PAGES_BASE_PATH`。

语音可选择设备日语声音或 VOICEVOX。VOICEVOX 需在访问网站的设备上运行，默认地址为 `http://127.0.0.1:50021`，并允许网站 Origin 的连接；可通过 `.env.local` 中的 `VITE_VOICEVOX_URL` 修改地址，修改后重启开发服务或重新构建。在设置页检测并选择声音。

学习记录和书面草稿保存在当前浏览器的 `localStorage` 中，按课程和课次区分。

`src/generated`、`public/course-assets`、`dist`、`.vinext`、`.next` 和 `*.tsbuildinfo` 为生成物，无需提交。修改 Schema 后运行 `pnpm validate:content`，并一并提交生成的 `src/modules/catalog/domain/content.ts`。
