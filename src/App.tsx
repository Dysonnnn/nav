import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { Config, Group, Site } from './types'
import {
  clearDraft,
  downloadConfig,
  isValidConfig,
  loadBaseConfig,
  loadDraft,
  newId,
  saveDraft,
} from './lib/config'
import { clearPingCache } from './lib/ping'
import { SearchBar } from './components/SearchBar'
import { ThemeToggle } from './components/ThemeToggle'
import { GroupSection } from './components/GroupSection'
import { SiteEditModal } from './components/SiteEditModal'
import { GroupEditModal } from './components/GroupEditModal'
import { SettingsModal } from './components/SettingsModal'
import { setDocumentTitle, setFaviconHref } from './lib/head'
import {
  ALL_STATE,
  ALL_TAB,
  type TabState,
  syncHash,
  tabStateFromHash,
} from './lib/tabHash'
import {
  IconCheck,
  IconDownload,
  IconEdit,
  IconPlus,
  IconReset,
  IconSettings,
  IconUpload,
} from './lib/icons'

type EditingSite = { groupId: string; site: Site | null } | null
type EditingGroup = Group | 'new' | null

// Admin (the "后台" button + edit bar + modals + localStorage draft) is enabled
// in `npm run dev` and in any build started with VITE_ADMIN=true. Default
// production builds ship the navigation only — visitors get a clean, read-only
// page driven entirely by the published config.json.
const ADMIN_ENABLED = import.meta.env.DEV || import.meta.env.VITE_ADMIN === 'true'

export default function App() {
  const [config, setConfig] = useState<Config | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [hasDraft, setHasDraft] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [query, setQuery] = useState('')
  const [tabState, setTabState] = useState<TabState>(ALL_STATE)
  const [editingSite, setEditingSite] = useState<EditingSite>(null)
  const [editingGroup, setEditingGroup] = useState<EditingGroup>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const tabInitRef = useRef(false)

  useEffect(() => {
    const draft = ADMIN_ENABLED ? loadDraft() : null
    if (draft) {
      setConfig(draft)
      setHasDraft(true)
      return
    }
    loadBaseConfig()
      .then(setConfig)
      .catch((e: Error) => setError(e.message))
  }, [])

  // Validate tabState whenever config changes (groups/subgroups may have been deleted).
  useEffect(() => {
    if (!config) return
    if (tabState.tab === ALL_TAB) return
    const group = config.groups.find((g) => g.id === tabState.tab)
    if (!group) {
      setTabState(ALL_STATE)
      return
    }
    if (tabState.subgroup && !group.subgroups?.some((s) => s.id === tabState.subgroup)) {
      setTabState({ tab: group.id, subgroup: null })
    }
  }, [config, tabState])

  // First-time tab init: hash > settings.defaultTab > ALL.
  useEffect(() => {
    if (!config || tabInitRef.current) return
    tabInitRef.current = true
    const fromHash = tabStateFromHash(window.location.hash, config.groups)
    if (fromHash.tab !== ALL_TAB) {
      setTabState(fromHash)
      return
    }
    const dft = config.settings?.defaultTab
    if (dft && config.groups.some((g) => g.id === dft)) {
      setTabState({ tab: dft, subgroup: null })
    }
  }, [config])

  // Sync tabState → URL hash.
  useEffect(() => {
    if (!config || !tabInitRef.current) return
    syncHash(tabState, config.groups)
  }, [tabState, config])

  // Listen to back/forward.
  useEffect(() => {
    if (!config) return
    const handler = () =>
      setTabState(tabStateFromHash(window.location.hash, config.groups))
    window.addEventListener('hashchange', handler)
    return () => window.removeEventListener('hashchange', handler)
  }, [config])

  useEffect(() => {
    if (config?.title) setDocumentTitle(config.title)
  }, [config?.title])

  useEffect(() => {
    setFaviconHref(config?.settings?.favicon || `${import.meta.env.BASE_URL}favicon.svg`)
  }, [config?.settings?.favicon])

  const updateConfig = (next: Config) => {
    setConfig(next)
    saveDraft(next)
    setHasDraft(true)
  }

  const pingEnabled = config?.settings?.enablePing ?? false
  const togglePing = () => {
    if (!config) return
    const next = { ...config, settings: { ...config.settings, enablePing: !pingEnabled } }
    clearPingCache()
    updateConfig(next)
  }

  const isSearching = query.trim() !== ''
  const currentGroup =
    tabState.tab !== ALL_TAB ? config?.groups.find((g) => g.id === tabState.tab) : undefined

  const visibleGroups = useMemo(() => {
    if (!config) return []
    let groups = config.groups
    if (isSearching) {
      const q = query.trim().toLowerCase()
      groups = groups
        .map((g) => ({
          ...g,
          sites: g.sites.filter(
            (s) =>
              s.name.toLowerCase().includes(q) ||
              (s.description ?? '').toLowerCase().includes(q) ||
              s.url.toLowerCase().includes(q),
          ),
        }))
        .filter((g) => g.sites.length > 0 || g.name.toLowerCase().includes(q))
    } else if (tabState.tab !== ALL_TAB) {
      groups = groups.filter((g) => g.id === tabState.tab)
      if (tabState.subgroup) {
        const sub = tabState.subgroup
        groups = groups.map((g) => ({
          ...g,
          sites: g.sites.filter((s) => s.subgroupIds?.includes(sub)),
        }))
      }
    }
    return groups
  }, [config, query, tabState, isSearching])

  const handleSiteSave = (groupId: string, site: Site) => {
    if (!config) return
    const groups = config.groups.map((g) => {
      if (g.id !== groupId) return g
      const exists = g.sites.some((s) => s.id === site.id)
      return {
        ...g,
        sites: exists ? g.sites.map((s) => (s.id === site.id ? site : s)) : [...g.sites, site],
      }
    })
    updateConfig({ ...config, groups })
    setEditingSite(null)
  }

  const handleSiteDelete = (groupId: string, siteId: string) => {
    if (!config) return
    const groups = config.groups.map((g) =>
      g.id !== groupId ? g : { ...g, sites: g.sites.filter((s) => s.id !== siteId) },
    )
    updateConfig({ ...config, groups })
  }

  const handleSiteCopy = (groupId: string, siteId: string) => {
    if (!config) return
    const groups = config.groups.map((g) => {
      if (g.id !== groupId) return g
      const i = g.sites.findIndex((s) => s.id === siteId)
      if (i < 0) return g
      const original = g.sites[i]
      const copy: Site = { ...original, id: newId(), name: `${original.name} 副本` }
      const sites = [...g.sites.slice(0, i + 1), copy, ...g.sites.slice(i + 1)]
      return { ...g, sites }
    })
    updateConfig({ ...config, groups })
  }

  const handleSiteMove = (groupId: string, siteId: string, dir: -1 | 1) => {
    if (!config) return
    const groups = config.groups.map((g) => {
      if (g.id !== groupId) return g
      const i = g.sites.findIndex((s) => s.id === siteId)
      const j = i + dir
      if (i < 0 || j < 0 || j >= g.sites.length) return g
      const sites = [...g.sites]
      ;[sites[i], sites[j]] = [sites[j], sites[i]]
      return { ...g, sites }
    })
    updateConfig({ ...config, groups })
  }

  const handleGroupSave = (group: Group) => {
    if (!config) return
    const exists = config.groups.some((g) => g.id === group.id)
    const groups = exists
      ? config.groups.map((g) => (g.id === group.id ? group : g))
      : [...config.groups, group]
    updateConfig({ ...config, groups })
    setEditingGroup(null)
  }

  const handleGroupDelete = (groupId: string) => {
    if (!config) return
    if (!confirm('删除该分组及其下所有链接？')) return
    updateConfig({ ...config, groups: config.groups.filter((g) => g.id !== groupId) })
    setEditingGroup(null)
  }

  const handleGroupMove = (groupId: string, dir: -1 | 1) => {
    if (!config) return
    const i = config.groups.findIndex((g) => g.id === groupId)
    const j = i + dir
    if (i < 0 || j < 0 || j >= config.groups.length) return
    const groups = [...config.groups]
    ;[groups[i], groups[j]] = [groups[j], groups[i]]
    updateConfig({ ...config, groups })
  }

  const handleResetDraft = async () => {
    if (!confirm('清除本地草稿并恢复到已发布的 config.json？')) return
    clearDraft()
    setHasDraft(false)
    try {
      const base = await loadBaseConfig()
      setConfig(base)
    } catch (e) {
      setError((e as Error).message)
    }
  }

  const handleImport = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'application/json,.json'
    input.onchange = () => {
      const file = input.files?.[0]
      if (!file) return
      file.text().then((text) => {
        try {
          const parsed: unknown = JSON.parse(text)
          if (!isValidConfig(parsed)) {
            alert('JSON 结构不符合 Config 类型，未导入。')
            return
          }
          updateConfig(parsed)
        } catch {
          alert('无法解析 JSON 文件。')
        }
      })
    }
    input.click()
  }

  if (error) return <div className="p-8 text-red-500">加载失败: {error}</div>
  if (!config) return <div className="p-8 text-zinc-500">加载中…</div>

  const showAllLayout = isSearching || tabState.tab === ALL_TAB
  const showSubgroupHeadings = !tabState.subgroup
  const showSubgroupPills =
    !isSearching && tabState.tab !== ALL_TAB && (currentGroup?.subgroups?.length ?? 0) > 0

  return (
    <div className="min-h-full">
      <header className="sticky top-0 z-20 bg-zinc-50/80 dark:bg-zinc-950/80 backdrop-blur border-b border-zinc-200 dark:border-zinc-800">
        <div className="mx-auto max-w-6xl px-4 py-3 flex flex-wrap items-center gap-x-3 gap-y-2">
          <h1 className="order-1 text-base sm:text-lg font-semibold flex-shrink-0">
            {config.title}
          </h1>
          <div className="order-3 sm:order-2 w-full sm:w-auto sm:flex-1 sm:max-w-xl">
            <SearchBar value={query} onChange={setQuery} />
          </div>
          <div className="order-2 sm:order-3 ml-auto sm:ml-0 flex items-center gap-2">
            <ThemeToggle />
            {ADMIN_ENABLED && (
              <button
                type="button"
                onClick={() => setEditMode((v) => !v)}
                className={`inline-flex items-center gap-1.5 rounded-md px-2.5 sm:px-3 py-1.5 text-sm font-medium transition-colors ${
                  editMode
                    ? 'bg-blue-600 text-white hover:bg-blue-500'
                    : 'border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                }`}
              >
                {editMode ? <IconCheck /> : <IconEdit />}
                {editMode ? '完成' : '后台'}
              </button>
            )}
          </div>
        </div>

        {ADMIN_ENABLED && editMode && (
          <div className="mx-auto max-w-6xl px-4 pb-3 space-y-2">
            <div className="flex items-center gap-2 flex-wrap text-sm">
              <button
                type="button"
                onClick={() => setSettingsOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-md border border-zinc-300 dark:border-zinc-700 px-2.5 py-1 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <IconSettings /> 站点设置
              </button>
              <button
                type="button"
                onClick={() => setEditingGroup('new')}
                className="inline-flex items-center gap-1.5 rounded-md border border-zinc-300 dark:border-zinc-700 px-2.5 py-1 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <IconPlus /> 新建分组
              </button>
              <button
                type="button"
                onClick={handleImport}
                className="inline-flex items-center gap-1.5 rounded-md border border-zinc-300 dark:border-zinc-700 px-2.5 py-1 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <IconUpload /> 导入 JSON
              </button>
              <button
                type="button"
                onClick={handleResetDraft}
                className="inline-flex items-center gap-1.5 rounded-md border border-zinc-300 dark:border-zinc-700 px-2.5 py-1 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <IconReset /> 重置为已发布
              </button>

              <label className="ml-auto inline-flex items-center gap-2 rounded-md border border-zinc-300 dark:border-zinc-700 px-2.5 py-1 cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800">
                <input
                  type="checkbox"
                  checked={pingEnabled}
                  onChange={togglePing}
                  className="accent-blue-600"
                />
                <span>启用连通性检测</span>
              </label>

              <button
                type="button"
                onClick={() => downloadConfig(config)}
                className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 text-white px-3 py-1 hover:bg-blue-500"
                title="下载 config.json，覆盖到 public/config.json 或服务器上的 dist/config.json 即生效"
              >
                <IconDownload /> 下载配置文件
              </button>
            </div>
            {hasDraft && (
              <div className="text-xs text-amber-600 dark:text-amber-400">
                ● 当前为本地草稿。点击「下载配置文件」，用下载的文件覆盖
                <code className="mx-1 px-1 rounded bg-zinc-200 dark:bg-zinc-800">public/config.json</code>
                （仓库部署）或服务器上的
                <code className="mx-1 px-1 rounded bg-zinc-200 dark:bg-zinc-800">dist/config.json</code>
                即可发布。
              </div>
            )}
          </div>
        )}

        <div className="mx-auto max-w-6xl px-4">
          <div className="flex gap-1 overflow-x-auto -mb-px scrollbar-thin">
            {config.groups.map((g) => (
              <TabButton
                key={g.id}
                active={!isSearching && tabState.tab === g.id}
                onClick={() => setTabState({ tab: g.id, subgroup: null })}
                color={g.color}
              >
                {g.name}
                <span className="ml-1.5 text-xs opacity-60">{g.sites.length}</span>
              </TabButton>
            ))}
            <TabButton
              active={!isSearching && tabState.tab === ALL_TAB}
              onClick={() => setTabState(ALL_STATE)}
            >
              全部
            </TabButton>
            {isSearching && (
              <span className="ml-2 self-center text-xs text-zinc-500">
                搜索中：跨所有分组
              </span>
            )}
          </div>
        </div>

        {showSubgroupPills && currentGroup?.subgroups && (
          <div className="mx-auto max-w-6xl px-4 pt-3 pb-2">
            <div className="flex gap-1.5 flex-wrap">
              <Pill
                active={!tabState.subgroup}
                onClick={() => setTabState({ tab: tabState.tab, subgroup: null })}
              >
                全部
              </Pill>
              {currentGroup.subgroups.map((sg) => (
                <Pill
                  key={sg.id}
                  active={tabState.subgroup === sg.id}
                  onClick={() => setTabState({ tab: tabState.tab, subgroup: sg.id })}
                >
                  {sg.name}
                </Pill>
              ))}
            </div>
          </div>
        )}
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 space-y-8">
        {visibleGroups.length === 0 && (
          <div className="text-center text-zinc-500 py-16">
            {isSearching ? '没有匹配的内容' : '该分组暂无内容'}
          </div>
        )}
        {visibleGroups.map((g) => (
          <GroupSection
            key={g.id}
            group={g}
            editMode={editMode}
            pingEnabled={pingEnabled}
            showHeader={showAllLayout}
            showSubgroupHeadings={showSubgroupHeadings}
            onEditGroup={() => setEditingGroup(g)}
            onMoveGroup={(dir) => handleGroupMove(g.id, dir)}
            onAddSite={() => setEditingSite({ groupId: g.id, site: null })}
            onEditSite={(s) => setEditingSite({ groupId: g.id, site: s })}
            onDeleteSite={(s) => handleSiteDelete(g.id, s.id)}
            onMoveSite={(s, dir) => handleSiteMove(g.id, s.id, dir)}
            onCopySite={(s) => handleSiteCopy(g.id, s.id)}
          />
        ))}
      </main>

      {ADMIN_ENABLED && editingSite && (
        <SiteEditModal
          site={editingSite.site}
          group={config.groups.find((g) => g.id === editingSite.groupId)!}
          onClose={() => setEditingSite(null)}
          onSave={(s) => handleSiteSave(editingSite.groupId, s)}
        />
      )}
      {ADMIN_ENABLED && editingGroup && (
        <GroupEditModal
          group={editingGroup === 'new' ? null : editingGroup}
          onClose={() => setEditingGroup(null)}
          onSave={handleGroupSave}
          onDelete={editingGroup !== 'new' ? () => handleGroupDelete(editingGroup.id) : undefined}
        />
      )}
      {ADMIN_ENABLED && settingsOpen && (
        <SettingsModal
          config={config}
          onClose={() => setSettingsOpen(false)}
          onSave={(next) => {
            updateConfig(next)
            setSettingsOpen(false)
          }}
        />
      )}
    </div>
  )
}

function TabButton({
  active,
  color,
  onClick,
  children,
}: {
  active: boolean
  color?: string
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative inline-flex items-center px-3.5 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
        active
          ? 'border-blue-500 text-blue-600 dark:text-blue-400'
          : 'border-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
      }`}
    >
      {color && (
        <span
          className="inline-block w-2 h-2 rounded-full mr-2 flex-shrink-0"
          style={{ backgroundColor: color }}
        />
      )}
      {children}
    </button>
  )
}

function Pill({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs whitespace-nowrap transition-colors ${
        active
          ? 'bg-blue-600 text-white'
          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
      }`}
    >
      {children}
    </button>
  )
}
