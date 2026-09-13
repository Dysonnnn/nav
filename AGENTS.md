# Nav 项目架构说明

面向 AI/开发者的架构速查文档。描述前端应用结构、数据流、构建产物，以及本地静态服务的组织方式。

## 1. 概览

纯静态个人导航页，零后端。前端由 Vite 构建为静态资源，运行时从 `config.json` 拉取导航数据。本地通过 Python 内置 HTTP 服务托管 `dist/`，由 `serve.sh` 统一管理启停。

- 技术栈：React 19 + TypeScript 5.6 + Vite 6 + Tailwind CSS v4（`@tailwindcss/vite` 插件，无 PostCSS 配置）
- 包管理：npm
- 无测试、无 lint 配置、无 CI

## 2. 目录结构

```
.
├── index.html              # Vite 入口，挂载 #root，引用 /src/main.tsx
├── vite.config.ts          # plugins: react + tailwindcss；base = VITE_BASE ?? './'
├── serve.sh                # 静态服务管理脚本（start/stop/restart/status）
├── agents.md               # 本文件：架构说明
├── local-web-list.md       # /root/tools 下各本地 Web 服务的端口与地址清单
├── public/
│   ├── config.json         # 导航数据（构建时原样拷贝到 dist/）
│   └── favicon.svg
├── src/
│   ├── main.tsx            # React 入口
│   ├── App.tsx             # 唯一有状态的容器组件，全部业务逻辑在此
│   ├── index.css           # Tailwind 入口 + 自定义变体
│   ├── types.ts            # Config / Group / Subgroup / Site / Settings / PingStatus
│   ├── components/         # 纯展示组件，无内部请求，全部受控于 App
│   │   ├── GroupSection.tsx    # 分组区块 + 卡片网格
│   │   ├── SiteCard.tsx        # 单个站点卡片，连通性指示灯
│   │   ├── SearchBar.tsx       # 搜索输入（/ 聚焦，Esc 清空）
│   │   ├── ThemeToggle.tsx     # 明暗切换
│   │   ├── Modal.tsx           # 通用弹窗壳（Esc 关闭、点遮罩关闭）
│   │   ├── SiteEditModal.tsx   # 站点增删改
│   │   ├── GroupEditModal.tsx  # 分组增删改 + 子分组
│   │   ├── SettingsModal.tsx   # 站点设置、导入导出
│   │   └── IconBox.tsx         # 图标渲染（SVG 内联 / <img> 二选一）
│   └── lib/
│       ├── config.ts       # config.json 加载、localStorage 草稿、导入导出、校验
│       ├── tabHash.ts      # tab 状态 <-> URL hash 编解码
│       ├── ping.ts         # 连通性探测（加载 favicon 图片）
│       ├── iconSrc.ts      # SVG 字符串识别、单色改写、XSS 清洗
│       ├── theme.ts        # 主题读写 localStorage + 切换 <html class="dark">
│       ├── head.ts         # 动态设置 document.title / favicon
│       └── icons.tsx       # 内联 SVG 图标组件
├── dist/                   # 构建产物（git 忽略）
└── logs/                   # 服务日志与 PID（git 忽略）
```

## 3. 前端架构

### 3.1 组件树

```
main.tsx
└── App.tsx                  # 持有全部状态
    ├── ThemeToggle
    ├── SearchBar
    ├── TabButton[]          # 分组标签（App 内部小组件）
    ├── Pill[]               # 子分组筛选（App 内部小组件）
    ├── GroupSection[]       # 每个分组一个
    │   └── SiteCard[]
    └── Modal 壳
        ├── SettingsModal
        ├── GroupEditModal
        └── SiteEditModal
```

所有组件均为受控组件，`App.tsx` 通过 props 下发数据与回调，无 Context、无状态库、无路由库。

### 3.2 状态（App.tsx）

| 状态 | 用途 |
|------|------|
| `config` | 当前生效的完整配置（唯一数据源） |
| `error` | config.json 加载失败信息 |
| `hasDraft` | 是否存在未导出的本地草稿 |
| `editMode` | 后台编辑模式开关 |
| `query` | 搜索关键词 |
| `tabState` | `{ tab, subgroup }`，当前分组与子分组 |
| `editingSite` / `editingGroup` / `settingsOpen` | 弹窗状态 |

### 3.3 配置数据流

配置来源优先级（`App.tsx:58-68`）：

1. **localStorage 草稿** — 键 `nav:draft-config`，仅当 `ADMIN_ENABLED` 时读取
2. **`config.json`** — `fetch(BASE_URL + 'config.json')`，`cache: 'no-store'`

后台模式的写入路径：所有增删改都走 `updateConfig()`（`App.tsx:122`），即 `setConfig(next)` + `saveDraft(next)` + `setHasDraft(true)`。草稿只落在浏览器 localStorage，不会自动写回仓库；需通过「导出」下载 `config.json` 人工覆盖 `public/config.json`。「重置」调用 `clearDraft()` 回到 `config.json`。

> 因此后台编辑是**纯前端临时态**，刷新保留、换浏览器丢失、不持久化到服务端。

后台入口开关（`App.tsx:44`）：
```ts
const ADMIN_ENABLED = import.meta.env.DEV || import.meta.env.VITE_ADMIN === 'true'
```
生产构建默认关闭后台，页面为只读。

### 3.4 视图过滤

`visibleGroups`（`App.tsx:140`）按优先级计算：
- 搜索中：跨所有分组按 name / description / url 过滤，命中分组名也保留
- 否则按 `tabState.tab` 过滤分组，若指定 `subgroup` 再按 `site.subgroupIds` 过滤

### 3.5 URL hash 同步

`lib/tabHash.ts` 将 tab 状态编码为 `#分组名` 或 `#分组名/子分组名`（按名称匹配，兼容 id）。写入用 `history.replaceState`（不产生历史记录），并监听 `hashchange` 支持前进/后退。首次加载时 hash 优先于 `settings.defaultTab`。

### 3.6 主题

`lib/theme.ts` 在 `<html>` 上切换 `dark` 类；Tailwind v4 通过 `@custom-variant dark (&:where(.dark, .dark *))`（`index.css:3`）适配。

### 3.7 连通性检测

`lib/ping.ts` 采用两级探测，默认探测 `origin/favicon.ico`，可用 `site.probeUrl` 覆盖：

1. `probeImage` — 用 `new Image()` 加载图片，最准确
2. `probeConnect` — 图片加载失败时兜底，`fetch(url, { method: 'HEAD', mode: 'no-cors' })`。只要能建立连接并拿到 HTTP 响应（不论 404/501）即判定可达，仅在网络层失败时判为不可达

> 兜底是必需的：本机自建服务大多没有 favicon，纯 `<img>` 探测会把它们全部误报为不可达。反之若去掉 `<img>` 只用 HEAD，外网站的判定又会过于宽松。

UI 呈现（`SiteCard.tsx`）：`online` 绿点、`offline` 红色 ✕（`IconClose`）、`unknown`（检测中）灰点，`title` 分别为「可访问 / 不可访问 / 检测中」。开关为 `settings.enablePing`，当前 `public/config.json` 已设为 `true`。

结果在内存缓存 60s，单次超时 5s。这是**浏览器侧探测**，结果依赖访问者网络：从外网访问本页时，`localhost` 条目会显示为不可达，属正常现象。

### 3.8 图标处理

`lib/iconSrc.ts` 支持 URL 或原始 SVG 字符串。SVG 会先经 `sanitizeSvg()` 剥离 `<script>` 与 `on*` 事件（因为单色 SVG 走 `dangerouslySetInnerHTML` 内联渲染），单色 SVG 的颜色改写为 `currentColor` 以适配暗色模式。

## 4. 构建

```bash
npm install       # 安装依赖
npm run dev       # Vite 开发服务器（后台编辑功能开启）
npm run build     # tsc -b && vite build -> dist/
npm run preview   # vite preview
```

- `base` 默认为 `'./'`（`vite.config.ts:7`），产物用相对路径，可部署到任意子路径
- `public/` 内容原样拷贝至 `dist/`，因此 `dist/config.json` 可在部署后直接修改而无需重新构建

## 5. 本地静态服务

### 5.1 为什么不能直接 serve 项目根目录

`index.html` 引用的是未编译的 `/src/main.tsx`。浏览器直接拿到 TSX 源码无法作为 ES module 执行，React 不会挂载，页面全白。**必须先 `npm run build`，再服务 `dist/`。**

### 5.2 serve.sh

```bash
./serve.sh start            # 构建（如需）并启动，默认端口 18080
./serve.sh start -p 8080    # 指定端口
./serve.sh start -b         # 强制重新构建
./serve.sh stop
./serve.sh restart -p 8080
./serve.sh status
```

实现要点：
- 服务进程：`cd dist && python3 -m http.server <port>`，以 `nohup` 后台运行
- 状态文件位于 `logs/`：`serve.pid`（进程号）、`serve.port`（端口）
- 日志分离：`logs/serve.log`（启停与构建记录）、`logs/access.log`（HTTP 访问日志）
- `start` 时若 `dist/` 或 `dist/index.html` 缺失，自动 `npm install` + `npm run build`
- 重复 `start` 会检测已有实例并跳过；`stop` 先 SIGTERM，1s 后仍未退出则 SIGKILL
- `run` 为前台模式，供进程管理器（termux-services / runit）托管，详见 5.3

### 5.3 服务托管（termux-services）

本机是 **proot-distro Ubuntu 运行在 Termux 内**，`systemd` 不可用（`systemctl is-system-running` 返回 `offline`）。服务生命周期走 Termux 层的 runit（`runsvdir`），与已有的 nginx / navidrome / sshd 同一套机制。

服务目录（Termux 层）：

```
/data/data/com.termux/files/usr/var/service/nav/
├── run        # 拉起 proot 内的 serve.sh run，并处理信号转发
└── log/run    # 复用 termux-services 的 svlogger
```

**proot 信号坑（重要）**：`proot` 不会把 TERM 转发给容器内进程。若 `run` 直接 `exec proot-distro login ...`，则 `sv stop` / `sv restart` 会永久卡在 `got TERM`——服务停不掉也重启不了。解决办法是 `run` 脚本自身 trap TERM/INT，然后主动杀内层进程（proot 不做 PID 隔离，容器内进程在 Termux 层可见，可直接 kill）：

```sh
cleanup() {
    pkill -f "http.server $PORT" 2>/dev/null
    pkill -f "$SVC" 2>/dev/null
    exit 0
}
trap cleanup TERM INT
proot-distro login ubuntu -- sh /root/tools/nav/serve.sh run &
wait
```

注意 `pkill -f` 的模式会匹配到**执行它的 shell 自身命令行**，在交互式排查时要用字符类规避（如 `http[.]server 18080`），否则会把当前终端杀掉。

管理命令（Termux 与 proot 内均可执行）：

```sh
sv=/data/data/com.termux/files/usr/bin/sv
nav=/data/data/com.termux/files/usr/var/service/nav
$sv status "$nav"     # 状态
$sv restart "$nav"    # 重启
$sv down "$nav"       # 停止且不再自启
$sv up "$nav"         # 重新拉起
```

- 进程崩溃或被 kill 后 runsv 数秒内自动拉起（已验证）
- 停止服务请用 `sv down`，不要用 `./serve.sh stop`，否则会被立刻重新拉起
- `serve.sh run` 仍写入 `logs/serve.pid`，所以 `./serve.sh status` 也可用于查看 PID

### 5.4 开机自启（Termux:Boot）

`~/.termux/boot/` 下的脚本会在设备开机后由 Termux:Boot 执行。已有 `start-qq-maid-bot.sh` 采用同样模式，本项目的 `~/.termux/boot/start-nav.sh` 与之保持一致：

1. `termux-wake-lock` 防止 Doze 杀后台
2. 若 `runsvdir` 未运行则后台拉起 `-P .../var/service`
3. `sv up nav` 唤醒服务
4. 轮询探测 18080，最多 20s，结果写入 `~/nav-boot.log`

脚本幂等，重复执行只会做 `sv up`。手动验证方式：

```sh
sv down /data/data/com.termux/files/usr/var/service/nav
/data/data/com.termux/files/home/.termux/boot/start-nav.sh   # 应恢复 200
```

Termux:Boot 生效的前提：**安装 Termux:Boot App**、**至少手动打开一次该 App** 以授予开机权限、**在系统设置里对 Termux 与 Termux:Boot 关闭电池优化**。三者缺一，开机脚本不会被触发。

### 5.5 运行时拓扑

```
浏览器 ──HTTP──> python3 -m http.server :18080 ──> dist/ 静态文件
                                                    ├── index.html
                                                    ├── assets/index-*.js
                                                    ├── assets/index-*.css
                                                    └── config.json
浏览器 ──fetch──> dist/config.json         （运行时数据）
浏览器 ──fetch──> 各站点 favicon            （连通性探测，跨域）
```

无反向代理、无 HTTPS、无后端 API。

## 6. 移动端适配

基准断点 Tailwind 默认（`sm` 640px / `md` 768px / `lg` 1024px）。

- 卡片网格（`GroupSection.tsx:45`）：`grid-cols-2 → sm:2 → md:3 → lg:4`，手机上两列
- Header（`App.tsx:292`）：用 `flex-wrap` + `order` 控制。窄屏第一行「标题 + 右侧按钮组」，第二行搜索框占满宽度；≥640px 恢复单行
- 弹窗（`Modal.tsx:16`）：`max-h-[85vh] overflow-y-auto overscroll-contain`，防止内容超高时被截断且无法滚动
- 触屏交互：`index.css:6` 定义了 `hover-hover` 变体（`@media (hover: hover) and (pointer: fine)`）。卡片编辑按钮（`SiteCard.tsx:66`）在触屏上于卡片内底部常显，在鼠标设备上保持悬浮右上角、hover 才显示

## 7. 修改代码时的注意事项

- 新增组件请保持受控：状态提升到 `App.tsx`，组件只接 props
- 改动 `types.ts` 后需同步更新后台编辑弹窗与 `isValidConfig()` 校验
- 改动 `public/config.json` 后：`dist/` 不会自动同步，需 `./serve.sh restart -b` 重建
- 导航中的「本地工具」分组对应本机其他服务，端口与地址见 `local-web-list.md`
- 只改 `dist/config.json` 可即时生效，但下次构建会被覆盖
- 使用 `dangerouslySetInnerHTML` 的路径必须经 `sanitizeSvg()`；新增图标渲染路径时不要绕过它
- 提交前跑 `npm run build`（含 `tsc -b` 类型检查），当前仓库无 pre-commit/CI 兜底
