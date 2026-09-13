#!/bin/sh
# 导航站静态服务管理脚本
# 用法: ./serve.sh {start|stop|restart|status} [-p PORT]
#   start   - 构建(如需)并以指定端口后台启动静态服务
#   run     - 前台运行（不 fork），供 runit / termux-services 等进程管理器托管
#   stop    - 停止服务
#   restart - 重启服务
#   status  - 查看服务状态
# 选项:
#   -p PORT  指定端口, 默认 18080
#   -b       强制重新构建

set -e

APP_DIR=$(cd "$(dirname "$0")" && pwd)
PORT=18080
FORCE_BUILD=0
LOG_DIR="$APP_DIR/logs"
LOG_FILE="$LOG_DIR/serve.log"
PID_FILE="$LOG_DIR/serve.pid"
ACCESS_LOG="$LOG_DIR/access.log"

usage() {
    echo "用法: $0 {start|run|stop|restart|status} [-p PORT] [-b]"
}

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

is_running() {
    [ -f "$PID_FILE" ] || return 1
    PID=$(cat "$PID_FILE")
    [ -n "$PID" ] || return 1
    kill -0 "$PID" 2>/dev/null
}

need_build() {
    [ "$FORCE_BUILD" = "1" ] && return 0
    [ ! -d "$APP_DIR/dist" ] && return 0
    [ ! -f "$APP_DIR/dist/index.html" ] && return 0
    return 1
}

do_build() {
    log "开始构建 dist ..."
    if [ ! -d "$APP_DIR/node_modules" ]; then
        log "安装依赖 npm install ..."
        npm install --prefix "$APP_DIR" >>"$LOG_FILE" 2>&1
    fi
    npm run build --prefix "$APP_DIR" >>"$LOG_FILE" 2>&1 || {
        log "构建失败, 详见 $LOG_FILE"
        exit 1
    }
    log "构建完成"
}

do_start() {
    if is_running; then
        log "服务已在运行, PID=$(cat "$PID_FILE"), 端口=$(cat "$LOG_DIR/serve.port" 2>/dev/null)"
        return 0
    fi
    if need_build; then
        do_build
    fi
    cd "$APP_DIR/dist"
    nohup python3 -m http.server "$PORT" >>"$ACCESS_LOG" 2>&1 &
    PID=$!
    echo "$PID" >"$PID_FILE"
    echo "$PORT" >"$LOG_DIR/serve.port"
    sleep 1
    if is_running; then
        log "服务已启动 PID=$PID 端口=$PORT -> http://localhost:$PORT"
    else
        log "服务启动失败, 详见 $ACCESS_LOG"
        rm -f "$PID_FILE"
        exit 1
    fi
}

# 前台运行，PID 保持不变，exec 后由进程管理器接管生命周期
do_run() {
    if need_build; then
        do_build
    fi
    cd "$APP_DIR/dist"
    echo $$ >"$PID_FILE"
    echo "$PORT" >"$LOG_DIR/serve.port"
    log "前台运行 端口=$PORT (由进程管理器托管, 停止请用 sv stop / kill)"
    exec python3 -m http.server "$PORT"
}

do_stop() {
    if ! is_running; then
        log "服务未在运行"
        rm -f "$PID_FILE"
        return 0
    fi
    PID=$(cat "$PID_FILE")
    log "停止服务 PID=$PID"
    kill "$PID" 2>/dev/null || true
    sleep 1
    if kill -0 "$PID" 2>/dev/null; then
        kill -9 "$PID" 2>/dev/null || true
    fi
    rm -f "$PID_FILE"
    log "服务已停止"
}

do_status() {
    if is_running; then
        PID=$(cat "$PID_FILE")
        PORT=$(cat "$LOG_DIR/serve.port" 2>/dev/null)
        echo "状态: 运行中"
        echo "PID:  $PID"
        echo "端口: $PORT"
        echo "地址: http://localhost:$PORT"
        echo "目录: $APP_DIR/dist"
    else
        echo "状态: 已停止"
        rm -f "$PID_FILE"
    fi
    echo "日志: $LOG_FILE (管理) / $ACCESS_LOG (访问)"
}

CMD=$1
[ -n "$CMD" ] || { usage; exit 1; }
shift
mkdir -p "$LOG_DIR"

while [ $# -gt 0 ]; do
    case "$1" in
        -p) PORT=$2; shift 2 ;;
        -b) FORCE_BUILD=1; shift ;;
        *) usage; exit 1 ;;
    esac
done

case "$CMD" in
    start)   do_start ;;
    run)     do_run ;;
    stop)    do_stop ;;
    restart) do_stop; FORCE_BUILD=${FORCE_BUILD:-0}; do_start ;;
    status)  do_status ;;
    *)       usage; exit 1 ;;
esac
