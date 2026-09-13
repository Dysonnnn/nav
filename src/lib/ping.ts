import type { PingStatus } from '../types'

const cache = new Map<string, { status: PingStatus; ts: number }>()
const TTL = 60_000
const TIMEOUT = 5_000

export function defaultProbeUrl(siteUrl: string): string {
  try {
    const u = new URL(siteUrl)
    return `${u.origin}/favicon.ico`
  } catch {
    return siteUrl
  }
}

// `<img>` 是最可靠的探测手段，但要求目标有可加载的图片资源。许多自建服务
// （含本机的 Python 静态服务、FastAPI）没有 favicon，会全部误判为不可达，
// 因此在图片加载失败时用 no-cors HEAD 兜底：只要能建立连接并拿到 HTTP 响应
// （不论状态码）即判定为可达。
function probeImage(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image()
    let done = false
    const finish = (ok: boolean) => {
      if (done) return
      done = true
      img.onload = img.onerror = null
      resolve(ok)
    }
    const timer = setTimeout(() => finish(false), TIMEOUT)
    img.onload = () => {
      clearTimeout(timer)
      finish(true)
    }
    img.onerror = () => {
      clearTimeout(timer)
      finish(false)
    }
    const sep = url.includes('?') ? '&' : '?'
    img.src = `${url}${sep}_=${Date.now()}`
  })
}

function probeConnect(url: string): Promise<boolean> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT)
  return fetch(url, {
    method: 'HEAD',
    mode: 'no-cors',
    cache: 'no-store',
    signal: ctrl.signal,
  })
    .then(() => {
      clearTimeout(timer)
      return true
    })
    .catch(() => {
      clearTimeout(timer)
      return false
    })
}

export function probe(probeUrl: string): Promise<PingStatus> {
  const cached = cache.get(probeUrl)
  if (cached && Date.now() - cached.ts < TTL) {
    return Promise.resolve(cached.status)
  }

  return probeImage(probeUrl)
    .then((imgOk) => (imgOk ? true : probeConnect(probeUrl)))
    .then((ok) => {
      const status: PingStatus = ok ? 'online' : 'offline'
      cache.set(probeUrl, { status, ts: Date.now() })
      return status
    })
}

export function clearPingCache() {
  cache.clear()
}
