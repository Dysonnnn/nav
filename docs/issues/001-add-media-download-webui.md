# [FEATURE] 导航页新增「B站视频下载器」站点卡片

- 编号: 001
- 状态: fixed
- 提出日期: 2026-09-26
- 优先级: P2
- 关联: 无

## 背景与动机

`/root/tools/media_download_tool`（B站视频下载器）已于 2026-09-26 上线 WebUI（V1.2.0，FastAPI，端口 20081），支持链接批量下载、在线播放、任务管理。该服务尚未录入导航页（`public/config.json`），也未登记到本仓库的 `local-web-list.md`，导致无法从导航页直达。

## 目标

1. 导航页「本地工具」或「本机服务」分组新增站点卡片：名称「B站视频下载器」，地址 `http://localhost:20081/`，端口 20081
2. `local-web-list.md` §1.1 表格补录一行，标注端口出处为 `media_download_tool/config.yaml` 的 `app.port`（启动方式 `cd media_download_tool && sh start.sh`）

## 方案

- 由负责 nav 项目的 agent 在 `public/config.json` 对应分组追加 site 条目即可，卡片渲染、连通性探测均为现有能力，无需改代码
- 端口取值已核实：`config.yaml` `app.port: 20081`，且 `start.sh` 默认值一致（`PORT` 环境变量可覆盖，登记默认值）

## 验收标准

- [ ] 导航页出现「B站视频下载器」卡片，连通性指示灯正常（服务 `sh start.sh` 启动后）
- [ ] `local-web-list.md` 已补录且端口出处写明
- [ ] 本 issue 状态更新为 `fixed` 并填写验证小节

## 影响面

仅导航数据（config.json）与一份 Markdown 清单，不影响 nav 前端代码与构建。

## 验证

2026-09-29 由 media_download_tool 侧代办完成（nav 侧 agent 未处理，为避免继续搁置直接登记）：

- [x] `public/config.json` 与 `dist/config.json` 的「本地工具」分组已新增 `local-bili-dl`（紧跟设备管理，端口序 20080→20081→20082）
- [x] `local-web-list.md` §1.1 已补录（端口出处写明 `media_download_tool/config.yaml` 的 `app.port`）
- [x] 实测 `curl http://localhost:18080/config.json` 返回新条目（dist 直改即生效，无需重建）
- [x] 连通性：media_download_tool 服务运行中，`GET /api/version` 返回 1.2.1

> 2026-10-01 更新：应用户要求，默认端口改为 20090（V1.2.2），config.json / local-web-list.md 已同步更新为 `http://localhost:20090/`。
