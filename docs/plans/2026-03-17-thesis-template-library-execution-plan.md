# 论文模板库与真实模板识别执行计划

日期：2026-03-17

## 1. 目标

在不推翻当前论文导出主链路的前提下，分阶段实现：

- 平台模板库
- 用户私有模板库
- 真实模板/样稿识别
- 模板画像沉淀
- 画像驱动导出
- 导出前格式体检与试导出

## 2. 实施策略

采用“先闭环、再增强、后高保真”的推进方式：

1. 第一阶段打通上传、识别、确认、保存、试导出、正式导出的闭环。
2. 第二阶段增强模板复用、评分、推荐、预览和识别准确率。
3. 第三阶段处理复杂模板、高保真母版增强和更严格学术规范。

## 3. Phase 1 可执行范围

### 3.1 后端与数据

- 定义 `FormatSpec`、`TemplateProfile`、`TemplateConfirmationItem`
- 新增 `.docx` OOXML 解包与结构抽取能力
- 实现模板识别主链路
- 实现低置信度确认项生成
- 新增模板校验与导出前体检
- 让导出接口支持接收模板画像

### 3.2 前端与交互

- 新增模板选择入口
- 新增模板上传入口
- 新增模板识别结果确认弹层
- 新增试导出入口
- 新增格式体检状态展示

### 3.3 导出链路

- 保留当前通用导出器
- 新增画像驱动导出器
- 优先使用模板画像导出
- 失败时可回退至通用导出

## 4. 任务拆分

### 工作流 A：类型与状态基础

目标：

- 为模板识别、模板库和导出流程提供统一数据结构

任务：

- 扩展 `src/types.d.ts`
- 新增 `src/store/template.ts`
- 定义模板版本、模板质量、待确认项、模板来源等枚举

验收：

- 前后端共用的类型齐备
- 模板状态可独立存储与读取

### 工作流 B：DOCX 结构解析与模板识别

目标：

- 从真实 `.docx` 提取模板画像

任务：

- 新建 `src/utils/docx-ooxml/`
- 实现 `styles.xml`、`document.xml`、`header/footer.xml`、section 信息读取
- 新建 `src/utils/template-spec/`
- 新建 `src/utils/template-profile/`
- 输出基础 `TemplateProfile`

验收：

- 至少能识别：封面、摘要、目录、正文、参考文献、致谢
- 能识别标题层级候选与封面字段候选
- 能输出置信度和待确认项

### 工作流 C：模板库 API

目标：

- 提供识别、校验、保存和读取模板的服务接口

任务：

- 新增 `POST /api/template/identify`
- 新增 `POST /api/template/validate`
- 新增 `POST /api/template/save`
- 设计模板持久化格式

验收：

- 上传模板后可得到画像
- 可保存模板并再次读取
- 可执行模板健康检查

### 工作流 D：前端模板流

目标：

- 在现有终稿页接入模板操作闭环

任务：

- 在 `FinalReport` 中增加模板入口
- 新建模板库弹层
- 新建模板上传弹层
- 新建低置信度确认弹层
- 新增格式体检 UI

验收：

- 用户可上传样稿
- 可看到识别摘要
- 低置信度项可确认
- 可保存到模板库

### 工作流 E：画像驱动导出

目标：

- 让导出不再只依赖固定代码模板

任务：

- 新建 `src/utils/thesis-assembly/`
- 实现 `PaperDocument -> 模板实例` 装配
- 在 `src/app/api/export/docx/route.ts` 接入模板画像参数
- 在 `src/utils/thesis-template.ts` 之外新增画像驱动导出器

验收：

- 选择模板后，导出能按模板画像调整结构与样式角色
- 未选择模板时，旧导出仍可用

## 5. 推荐并行分工

### 小组 1：数据与类型

负责：

- `src/types.d.ts`
- `src/store/template.ts`
- 模板相关 schema 与状态流

### 小组 2：DOCX 结构解析与识别

负责：

- `src/utils/docx-ooxml/`
- `src/utils/template-spec/`
- `src/utils/template-profile/`

### 小组 3：模板库 API 与持久化

负责：

- `/api/template/*`
- 模板保存、读取、校验

### 小组 4：前端模板流

负责：

- `src/components/Research/FinalReport/*`
- 模板库、模板上传、确认流、体检 UI

### 小组 5：导出与试导出

负责：

- `src/utils/thesis-assembly/`
- `src/app/api/export/docx/route.ts`
- 新旧导出链路衔接

## 6. 建议文件改动范围

### 重点新增

- `src/store/template.ts`
- `src/utils/docx-ooxml/*`
- `src/utils/template-spec/*`
- `src/utils/template-profile/*`
- `src/utils/thesis-assembly/*`
- `src/components/Research/FinalReport/TemplateLibraryDialog.tsx`
- `src/components/Research/FinalReport/TemplateUploadDialog.tsx`
- `src/components/Research/FinalReport/TemplateConfirmDialog.tsx`
- `src/components/Research/FinalReport/FormatCheckPanel.tsx`

### 重点修改

- `src/types.d.ts`
- `src/components/Research/FinalReport/index.tsx`
- `src/app/api/export/docx/route.ts`
- `src/utils/thesis-template.ts`
- `src/utils/paper.ts`

## 7. 开发顺序

建议顺序：

1. 先做类型与状态
2. 再做 OOXML 解析与模板识别
3. 同步做模板库 API
4. 前端接模板上传与确认流
5. 最后接画像驱动导出与试导出

原因：

- 先把模型立住，避免边写边改类型
- 先有识别结果，再谈确认与保存
- 最后接导出，避免导出器反复改输入结构

## 8. 第一阶段验收标准

- 用户可上传空白模板或完整样稿
- 系统能生成基础 `TemplateProfile`
- 低置信度项可以确认
- 模板可保存到模板库并再次选择
- 终稿页可显示格式体检结果
- 选择模板后可试导出
- 选择模板后可正式导出
- 没有模板时旧导出路径仍可用

## 9. 风险控制

- 不在第一阶段追求所有学校都高保真
- 不在第一阶段直接重构掉旧导出器
- 不在第一阶段做复杂 Word 原始母版回填
- 用“试导出 + 关键页预览”尽早暴露风险

## 10. 建议里程碑

### 里程碑 M1：模型与识别骨架

- 类型完成
- 模板 store 完成
- OOXML 解析骨架完成

### 里程碑 M2：识别闭环

- 模板上传
- 模板识别
- 确认项生成
- 模板保存

### 里程碑 M3：导出闭环

- 格式体检
- 试导出
- 正式导出
- 旧导出兜底

## 11. 建议工期

若 4 到 5 人并行：

- M1：2 到 3 天
- M2：3 到 5 天
- M3：3 到 5 天

首个可用版本预估：

- 8 到 13 个工作日

## 12. 当前结论

最推荐的执行方式不是一次性重做导出，而是：

- 先在现有仓库上补模板识别与模板库能力
- 再把导出入口升级为模板画像驱动
- 最后逐步增强高保真能力

这样能够最快得到“可用且可积累”的第一版。
