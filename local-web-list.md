# 本地 Web 服务清单

本机（`/root/tools/` 与 `/root/` 下）具备 Web 界面的自建服务汇总，均已录入导航页的「本地工具」「本机服务」分组。

> 端口与地址均取自各项目自带的说明文档（`README.md` / `readme.md` / `AGENTS.md`）或启动脚本默认值，未做人为调整。

## 1. 清单

### 1.1 `/root/tools/` 下的项目

| 名称 | 地址 | 端口 | 启动方式 | 端口出处 |
|---|---|---|---|---|
| 导航站（本页） | http://localhost:18080/ | 18080 | `cd /root/tools/nav && ./serve.sh start` | `nav/serve.sh` 默认 |
| 导航站 Python 版 | http://localhost:18081/ | 18081 | termux-services 托管；手动 `cd /root/tools/nav-py && python3 nav_web.py start` | `nav-py/nav_web.py` 默认 |
| 会话管理 | http://localhost:8080/index.html | 8080 | `cd agent-session-manage && ./start.sh` | `agent-session-manage/start.sh:21` |
| VPet 桌宠 | http://localhost:8081/index.html | 8081 | termux-services 托管；手动 `cd VPet && ./serve.sh run` | 2026-10-02 实施时改 8081（8080 被会话管理占用） |
| 手机工作台 | http://localhost:20083 | 20083 | 开机自启（Termux:Boot + termux-services）；手动：`cd workbench && bash bench-ctrl.sh start` | `workbench/bench-ctrl.sh:18` |
| 设备管理 | http://localhost:20080/ | 20080 | `cd device_manage && ./start.sh` | `device_manage/readme.md:86` |
| B站视频下载器 | http://localhost:20090/ | 20090 | `cd media_download_tool && sh start.sh` | `media_download_tool/config.yaml`（`app.port`，start.sh 默认一致） |
| 磁盘分析 Web | http://127.0.0.1:20082 | 20082 | `cd disk-manage && python3 disk_web.py` | `disk-manage/README.md:49` |
| 磁盘分析 Python 版 | http://127.0.0.1:8000 | 8000 | `cd disk-manage && python3 disk_manage.py --path ~/` | `disk-manage/README.md:71` |
| 抖音下载 | http://localhost:20084/ | 20084 | `cd douyin_download_by_trae && python webui.py` | `douyin_download_by_trae/webui.py:202`（README 写的 8000 已过时） |
| DSH Web UI | http://127.0.0.1:3080 | 3080 | termux-services 托管（正确用法 `dsh --profile web`，node 冷启动约 12s） | `deepseek-herness-tool/AGENTS.md:12` |

### 1.2 /root 下其他目录的服务

这些不在 `~/tools/` 内（当初的扫描范围之外），经逐个排查后按需补录：

| 名称 | 地址 | 端口 | 启动方式 | 端口出处 |
|---|---|---|---|---|
| Termux 系统面板 | http://127.0.0.1:20088 | 20088 | termux-services 托管；手动命令同左 | `termux_webui/README.md:27` |
| 文件服务器 | http://127.0.0.1:28011 | 28011 | termux-services 托管（绑定 127.0.0.1）；手动 `python3 http_server.py start --foreground` | `script/http_server.py:147` |
| Wiki 浏览器 | http://127.0.0.1:28012 | 28012 | termux-services 托管；手动 `cd /root/wiki-webui && npx tsx server/index.ts` | `wiki-webui/README.md:52` |
| 机器人控制台 | http://127.0.0.1:28797/console/ | 28797 | termux-services 托管（`botctl.sh run` 前台）；手动 `./botctl.sh start` | `qq-maid-bot/runtime-bot2/config/.env:58` |
| 版本监控 | http://127.0.0.1:28899/ | 28899 | termux-services 托管；手动 `./run.sh run` | `qq-maid-version-monitor/run.sh:26` |
| Termux 状态面板 | http://127.0.0.1:28900 | 28900 | termux-services 托管（绑定 127.0.0.1）；首页响应慢（每请求现场采集，约 10-30s） | `script/status-web.py:150` |
| yt-dlp Web UI | http://127.0.0.1:3033 | 3033 | termux-services 托管；手动 `python3 webui.py` | `software/yt-dlp/webui.py:14` |

注意事项：
- **Wiki 浏览器**需用户名密码 + TOTP 登录；绑定 `0.0.0.0`，局域网可达
- **Termux 状态面板**同样绑定 `0.0.0.0`（局域网可达）
- **机器人控制台**端口取实际生效的 `runtime-bot2`；旧 `runtime/config/.env` 里的 8787 与 `.env.example` 默认值均已不适用
- **版本监控**配套的 `forward.sh`（38899）只是 socat 转发，不单列

## 2. 端口占用矩阵

同一端口被多个服务声明为默认值，同时启动只有先占的那个生效：

| 端口 | 声明服务 | 处理建议 |
|---|---|---|
| 8080 | 会话管理 | 无冲突（VPet 已改 8081） |
| 8000 | 磁盘分析 Python 版 | 建议 `--port 8001` 避开历史占用 |
| 18080 | 导航站 | 无冲突 |
| 18081 | 导航站 Python 版 | 无冲突 |
| 20080 | 设备管理 | 无冲突 |
| 20082 | 磁盘分析 Web | 无冲突 |
| 20083 | 手机工作台 | 无冲突 |
| 3080 | DSH Web UI | 无冲突 |

各服务均支持换端口（`--port` 参数或 `PORT` 环境变量），改后需同步更新本表与 `public/config.json`。

## 3. 当前运行状态

以 `curl http://127.0.0.1:<port>/` 探测的结果：

| 端口 | 状态 |
|---|---|
| 8080、18080、18081、20080、20082、20083、20084、20088、28011、28012、28797、28899、28900、3033、3080 | 运行中（200） |
| 8000 | 未启动（磁盘分析 Python 版，与 20083 工作台共存时可按需启动） |

探测时间：2026-10-02。全部服务已注册 termux-services（runsv 守护 + 崩溃自愈），开机由 Termux:Boot 拉起。

## 3.5 开机启动状态

本机是自启动的两层机制：Termux 层的 runit（`/data/data/com.termux/files/usr/var/service/`）负责守护与崩溃自愈，`~/.termux/boot/` 下的脚本负责设备重启后拉起。二者通常需要配套。

| 服务 | 端口 | termux-services | Termux:Boot | 说明 |
|---|---|---|---|---|
| 导航站 nav | 18080 | ✅ | ✅ | 参考实现，含 proot 信号转发处理 |
| 导航站 Python 版 nav-py | 18081 | ✅ | ✅ | stdlib 单文件，编辑直接写回 config.json |
| 会话管理 | 8080 | ✅ | ✅ | 2026-09-14 实施 |
| VPet 桌宠 | 8081 | ✅ | ✅ | 2026-10-02 实施，新增 serve.sh，端口改 8081 避开会话管理 |
| 手机工作台 workbench | 20083 | ✅ | ✅ | `bench-ctrl.sh fg --no-reload` 前台模式 |
| 设备管理 | 20080 | ✅ | ✅ | issue 034 fixed |
| 磁盘分析 | 20082 / 8000 | ✅ disk-web、disk-manage-web、disk-scan | ✅ | issue 035 fixed |
| 抖音下载 | 20084 | ✅ | ✅ | 本机环境受限见 §1.1 备注 |
| DSH Web UI | 3080 | ✅ | ✅ | 2026-10-02 实施；正确用法 `dsh --profile web`，node 冷启动约 12s |
| termux_webui | 20088 | ✅ | ✅ | issue 022 resolved |
| Wiki 浏览器 | 28012 | ✅ | ✅ | issue 0009 fixed |
| 机器人控制台 qq-maid-bot | 28797 | ✅ | ✅ | 2026-10-02 补齐守护（`botctl.sh run` 前台），issue 001 fixed |
| 版本监控 | 28899 | ✅ | ✅ | issue 001 resolved |
| 文件服务器 script | 28011 | ✅ | ✅ | issue 001 resolved；bashrc 旧 hook 已清除 |
| Termux 状态面板 | 28900 | ✅ | ✅ | issue 001 resolved；首页响应慢属正常 |
| yt-dlp Web UI | 3033 | ✅ | ✅ | issue 001 resolved |

> 本机全部 Web 服务均已纳入 runsv 守护 + Termux:Boot 开机拉起，崩溃自动恢复。

各项目已建对应 issue 跟踪「服务开机启动」能力，详见各自的 `issues/`（或 `docs/issues/`）目录。

实现要点（踩过的坑，避免重复踩）：

- **proot 不转发信号**：`run` 脚本若直接 `exec proot-distro login ubuntu -- <cmd>`，`sv stop` / `sv restart` 会永久卡在 `got TERM`。必须 trap TERM/INT 后主动 kill 内层进程
- **必须有前台模式**：supervise 托管要求服务占住前台，daemon 化 + PID 文件的写法要改为 exec 前台运行
- **Termux:Boot 三前提**：安装 App、首次手动打开授权、对 Termux 与 Termux:Boot 关闭电池优化

## 4. 与导航页的对应关系

以上条目已录入 `public/config.json`：
- 1.1 的条目 → `local` 分组（显示在「本地工具」标签页）
- 1.2 的条目 → `local-services` 分组（显示在「本机服务」标签页）

- `url` — 点击后打开的地址
- `description` — 标注端口来源或冲突提示
- 未设置 `icon`，前端回退显示名称首字

改 `config.json` 后需重建才能让 `dist/` 同步：

```sh
cd /root/tools/nav && ./serve.sh restart -b
```

只想临时改动而避免被构建覆盖，可直接编辑 `dist/config.json`。

卡片上的连通性指示灯依赖 `settings.enablePing`，当前未开启；开启后 Python 静态服务类站点可能显示红点（无 favicon.ico），属正常现象。

## 5. 未纳入的目录

### `/root/tools/` 下

以下目录无 Web 界面或未达可用状态，故不在清单内：

| 目录 | 原因 |
|---|---|
| `remote_debug` | MCP 服务（TCP 8765），非 HTTP 网页，浏览器无法直接访问 |
| `agent-webui` | 调研阶段，卡在 A1 未启动，无可用前端 |
| `claude-how-to-use` | 中文使用手册，纯 Markdown 文档仓库 |
| `statusline-doc` | CodeBuddy 状态行脚本，无 Web 界面 |
| `termux_manage` | Termux 运维排障记录，纯文档 |
| `yolanda-skills` | Agent Skill 集合，非本地常驻服务 |
| `node22` / `node26` | Node.js 运行时与安装包，非项目 |

> `old-file/` 下为归档的调试脚本与日志（`install_dsh.sh`、`install_dsh.log`、`genlock.sh`、`genlock.log`），同样非服务；`git-tool` 为空目录。

### `/root/` 下其余目录

逐个排查后的判定（这些目录里 grep 到过端口，但均为噪声，不收录）：

| 目录 | 排查结论 |
|---|---|
| `Documents` | 纯 Markdown wiki + 条码 demo 静态页，无服务端代码 |
| `link2trae_file` | 唯一 HTTP 代码是一次性抖音 Cookie 抓取器（`douyin_cookie_catcher.py`，用完即停）；该目录是 `storage/Download/Android/trae` 的软链 |
| `my_setting` | `headroom` 为第三方 Rust clone（从未编译）；`code-server-config.yaml` 指向全局 code-server，非本目录项目；8787/8788 只出现在文档 curl 演示里 |
| `software` | 安装包堆放目录。`Douyin_TikTok_Download_API`（20180）是未运行过的第三方 clone；`jm_comic_tools` 的 jmview（8080）属第三方插件，存疑未收；`remote_debug_mcp_ctl` 是 TCP 12345 的 MCP 而非 HTTP。仅 `yt-dlp/webui.py` 为自建，已收录 |
| `storage` | 安卓共享存储，仅 FTP 脚本（2121）与旧 `htdocs` 备份 |

> 排查原则：`node_modules/` 内的框架一律不算服务；仅在 README 示例、curl 演示、代理转发配置里出现的端口不算有效端口。
