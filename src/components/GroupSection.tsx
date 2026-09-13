import type { Group, Site } from '../types'
import { SiteCard } from './SiteCard'
import { IconDown, IconEdit, IconPlus, IconUp } from '../lib/icons'

export function GroupSection({
  group,
  editMode,
  pingEnabled,
  showHeader = true,
  showSubgroupHeadings = false,
  onEditGroup,
  onMoveGroup,
  onAddSite,
  onEditSite,
  onDeleteSite,
  onMoveSite,
  onCopySite,
}: {
  group: Group
  editMode: boolean
  pingEnabled: boolean
  showHeader?: boolean
  showSubgroupHeadings?: boolean
  onEditGroup: () => void
  onMoveGroup: (dir: -1 | 1) => void
  onAddSite: () => void
  onEditSite: (s: Site) => void
  onDeleteSite: (s: Site) => void
  onMoveSite: (s: Site, dir: -1 | 1) => void
  onCopySite: (s: Site) => void
}) {
  const subgroups = group.subgroups ?? []
  const useSubgroupedLayout = showSubgroupHeadings && subgroups.length > 0
  const subIdSet = new Set(subgroups.map((s) => s.id))

  const orphanSites = group.sites.filter(
    (s) => !s.subgroupIds?.some((id) => subIdSet.has(id)),
  )
  const sitesBySubgroup = subgroups.map((sg) => ({
    subgroup: sg,
    sites: group.sites.filter((s) => s.subgroupIds?.includes(sg.id)),
  }))

  const renderGrid = (sites: Site[]) => (
    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
      {sites.map((s) => (
        <SiteCard
          key={s.id}
          site={s}
          editMode={editMode}
          pingEnabled={pingEnabled}
          onEdit={() => onEditSite(s)}
          onDelete={() => onDeleteSite(s)}
          onMove={(dir) => onMoveSite(s, dir)}
          onCopy={() => onCopySite(s)}
        />
      ))}
    </div>
  )

  return (
    <section>
      {(showHeader || editMode) && (
        <div className="flex items-center gap-2 mb-3">
          {showHeader && (
            <>
              <span
                className="inline-block w-1 h-5 rounded"
                style={{ backgroundColor: group.color ?? '#71717a' }}
              />
              <h2 className="text-base font-semibold">{group.name}</h2>
              <span className="text-xs text-zinc-500">{group.sites.length}</span>
            </>
          )}
          {editMode && (
            <div className={`flex items-center gap-1 ${showHeader ? 'ml-auto' : ''}`}>
              {showHeader && (
                <>
                  <button
                    type="button"
                    onClick={() => onMoveGroup(-1)}
                    className="rounded-md p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    title="上移分组"
                  >
                    <IconUp />
                  </button>
                  <button
                    type="button"
                    onClick={() => onMoveGroup(1)}
                    className="rounded-md p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    title="下移分组"
                  >
                    <IconDown />
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={onEditGroup}
                className="rounded-md p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                title="编辑分组"
              >
                <IconEdit />
              </button>
              <button
                type="button"
                onClick={onAddSite}
                className="inline-flex items-center gap-1 rounded-md border border-zinc-300 dark:border-zinc-700 px-2 py-0.5 text-xs hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <IconPlus /> 新链接
              </button>
            </div>
          )}
        </div>
      )}

      {useSubgroupedLayout ? (
        <div className="space-y-5">
          {orphanSites.length > 0 && renderGrid(orphanSites)}
          {sitesBySubgroup.map(({ subgroup, sites }) =>
            sites.length > 0 ? (
              <div key={subgroup.id}>
                <h3
                  className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2 pl-2 border-l-2"
                  style={{ borderColor: group.color ?? '#71717a' }}
                >
                  {subgroup.name}
                  <span className="ml-1.5 text-xs text-zinc-500 font-normal">
                    {sites.length}
                  </span>
                </h3>
                {renderGrid(sites)}
              </div>
            ) : null,
          )}
          {orphanSites.length === 0 &&
            sitesBySubgroup.every((b) => b.sites.length === 0) &&
            !editMode && (
              <div className="text-sm text-zinc-500">该分组暂无内容</div>
            )}
        </div>
      ) : (
        <>
          {renderGrid(group.sites)}
          {group.sites.length === 0 && !editMode && (
            <div className="text-sm text-zinc-500">该分组暂无内容</div>
          )}
        </>
      )}
    </section>
  )
}
