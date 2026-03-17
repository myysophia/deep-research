# 2026-03-17 画像驱动导出增强设计

## 1 目标与约束
- 目标：在当前导出链路（`thesis-export` + `thesis-template` + `/api/export/docx`）内，利用已有模板画像（`TemplateProfile`）自动驱动页眉/页脚、摘要/目录/标题/参考文献等关键结构的样式，最大程度复刻上传模板的视觉特征。只允许极少量已有 `layout/templateMeta` 作为兜底，避免新增复杂的前端手工配置。
- 约束：仅修改 `src/utils/thesis-export/*`、`src/utils/thesis-template.ts` 和 `/src/app/api/export/docx/route.ts`。语言及文档保持中文。

## 2 现状梳理
- 当前 `applyTemplateProfileToPaperDocument` 仅把模板画像用于整体页面边距、字体、页眉/页脚固定文本、页码位置的布局配置，对摘要、目录、正文、参考文献页面内容结构毫无影响。
- `TemplateProfile` 已包含 `pageRule`（页边距、页眉/页脚、页码信息）、`styleRoles`（各类文本的字体/字号/加粗/对齐）以及 `sections`（检测到的结构），可以驱动更多内容。
- `thesis-template` 在构造文档时固定使用 `createBodyParagraph`、`createHeading`、`createAbstractSectionChildren` 等函数，未考虑模板样式。

## 3 方案对比

### 3.1 方案 1：继续丰富 layoutConfig
- 说明：向 `layoutConfig` 里追加更多字段（例如摘要、目录标题、页眉/页脚对应字体/字号）并让 `thesis-template` 读取。
- 优点：变更集中、已有入口即可完成。
- 缺点：需要 `layoutConfig` 变得非常臃肿，不能反映诸如参考文献编号样式、摘要/目录页特有的页眉 header 文本或目录结构样式；处理复杂样式时流于贴标签。

### 3.2 方案 2（推荐）：由组装阶段产生样式 override 元数据
- 说明：在 `applyTemplateProfileToPaperDocument` 中收集从 `styleRoles` 和 `pageRule` 得到的字段，写入 `documentStyleOverrides` 之类的结构，并在 `thesis-template` 各章节构造函数中消费这些 override，使摘要/目录页、正文、参考文献以及页眉/页脚具备模板样式。仍从 `pageRule` 中获取页眉文本与编号信息。
- 优点：可在不改动 API 的前提下向各章节注入精细样式；保持 `thesis-template` 以内容生成为核心、`assemble` 以数据映射为核心的职责分工。
- 缺点：需要在 `thesis-template` 中新增多个样式入口，但可通过集中 helper 函数（如 `applyStyleRoleOverride(role, paragraph)`）封装。

### 3.3 方案 3：让 `thesis-template` 直接持有模板画像
- 说明：`buildTemplateThesisDocxBuffer` 接受完整 `templateProfile`，在内部直接根据 `styleRoles`/`sections` 调整各部分。
- 优点：避免在 assemble 层做映射。
- 缺点：`thesis-template` 会变得过于耦合模板识别细节，后续调用方需要也懂 `templateProfile`，不利于接口的清晰性。

## 4 推荐方案设计细节
### 4.1 架构概览
- `applyTemplateProfileToPaperDocument`：
  - 通过 `styleRoles` 提取摘要标题、目录标题、正文各级标题、参考文献标题/条目的字体、字号、加粗、对齐。
  - 构建一个 `documentStyleOverrides`（或 `thesisStyleOverride`）对象，封装上述数据以及 `pageRule` 的页眉/页脚/页码文本。
  - 将这个对象附加到 `PaperDocument`（比如 `paperDocument.styleOverrides`），并同步更新 `layoutConfig.pageMargins`、页码设置。
- `thesis-template.ts`：
  - 为 `createAbstractSectionChildren`、`createTocChildren`、`createHeading`、`buildReferenceChildren` 等增加 `styleOverrides` 参数，优先使用模板画像提供的字体/字号/对齐/加粗；未识别时退回到默认值。
  - 引入 `selectHeaderFooter(role)` helper，根据当前 Section 是否为摘要/目录/正文、`pageRule.hasDifferentFirstPage`、`pageRule.pageNumberFormat` 来选择合适的页眉/页脚文本；例如摘要页用 `pageRule.headerTextLeft` 作为摘要页左侧文本。
  - 目录页在生成 `TableOfContents` 前，可检查 `templateProfile.sections` 是否标记 `toc`，并用其 `label` 补充标题。

### 4.2 组件与职责
| 组件 | 职责 |
| --- | --- |
| `assemble.ts` | 解读模板画像 -> 生成 `styleOverrides`、页眉页脚文本、页码格式；注入 `PaperDocument.layoutConfig`。 |
| `thesis-template.ts` | 构建 Word 文档；新增逻辑使摘要/目录/正文/参考文献等章节量身使用 `styleOverrides` 和页眉/页脚文本。 |
| `route.ts` | 传递 `templateProfile`，并保持现有 `templateMeta` 默认值。 |

### 4.3 数据流
1. API 接收到 `paperDocument` + `templateProfile`。
2. `applyTemplateProfileToPaperDocument` 收集 `pageRule`、`styleRoles` -> 生成 `styleOverrides`，更新 `layoutConfig`（页边距、页眉/页脚等）并将 overrides 附着到 `PaperDocument`。
3. `buildTemplateThesisDocxBuffer` 构建文档时读取 `styleOverrides`（如 `abstractTitleRole`、`tocTitleRole`、`headingRoles`、`referenceItemRole`），并在各章节中以 `createRun`/`createHeading` 的字体/字号/加粗/对齐中体现；页眉/页脚逻辑通过新 helper 根据章节类型选择最贴近的文本。
4. 输出 docx buffer，不依赖前端配置。

### 4.4 错误处理与兜底
- 无 `templateProfile` 或缺失字段时，`applyTemplateProfileToPaperDocument` 直接返回传入 `PaperDocument`（或仅做 pageRule 兼容），`styleOverrides` 为空。
- `thesis-template.ts` 内的 helper 应把 `styleOverrides` 作为可选参数，未提供时沿用 `createDefaultPaperLayoutConfig()` 中的默认字体/字号/对齐。
- 所有新增逻辑避免抛错，仅在日志级别（必要时）记录未识别或 fallback 的信息。

### 4.5 测试与验收
- 编写单测覆盖 `collectStyleOverrides`（例如验证 `toc-title` 样式被推送到 override）。
- 使用 `buildTemplateThesisDocxBuffer` + mock `PaperDocument` 生成 docx 并解析 header/footer、摘要/目录段落字体/字号，验证匹配模板画像。
- 验收：导出结果的摘要/目录页字体/对齐与上传模板更一致，页眉/页脚文本与页码配置以模板为主，不新增前端配置。
