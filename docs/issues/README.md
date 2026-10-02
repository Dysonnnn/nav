# issues 索引

本目录用于**跟踪需求、功能与缺陷**。规范沿用 `device_manage`（源自 `agent-webui`）的 `docs/issues/NNN-slug.md` 三模板体系。

## 命名规则

- 文件名：`NNN-slug.md`
  - `NNN`：三位流水号，从 `001` 起，**只增不复用**（删除的 issue 编号也作废）
  - `slug`：英文小写 kebab-case，概括主题
- 文件内标题前缀（三选一，必须与所用模板一致）：
  - `[REQUIREMENT]` 需求
  - `[FEATURE]` 功能
  - `[BUG]` 缺陷
- 一个 issue 只讲一件事。

## 模板

| 模板 | 用途 |
|---|---|
| `templates/requirement.md` | 需求：要达成什么、为什么、约束与验收标准 |
| `templates/feature.md` | 功能：具体要做的增强 |
| `templates/bug.md` | 缺陷：现象、根因、复现、修复与验证 |

新建 issue 时**复制对应模板**再填写，保留全部小节；不适用的小节写「无」，不要删除。

## 状态流转

`open` → `in_progress` → `fixed` / `wontfix`

- 修复后填「验证」小节并写清验证方式（命令/接口/页面），**未经验证不得标 `fixed`**。
- `wontfix` 必须写明原因。

## 索引

| 编号 | 类型 | 标题 | 状态 | 严重度 |
|---|---|---|---|---|
| [001](001-add-media-download-webui.md) | FEATURE | 导航页新增「B站视频下载器」站点卡片（media_download_tool WebUI，端口 20081） | fixed | P2 |
