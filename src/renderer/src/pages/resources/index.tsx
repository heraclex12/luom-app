import { useSearchParams } from 'react-router-dom'
import { TopBar } from '@/components/layout/TopBar'
import { cn } from '@/lib/cn'
import { CategoryContent, CategoryIcon, RESOURCE_CATEGORIES } from './catalog'

/**
 * Resources page: single-column drill-down.
 *
 * Level 1 is a grid of category cards; clicking one opens its content (level 2) via the
 * `?category=` search param, so Back works through history. comingSoon categories are shown
 * greyed out at level 1 and a hand-typed URL for them falls back to level 1.
 */
export default function Resources(): React.JSX.Element {
  const [params, setParams] = useSearchParams()
  const active =
    RESOURCE_CATEGORIES.find((c) => c.id === params.get('category') && !c.comingSoon) ?? null

  return (
    <>
      <TopBar segments={active ? ['Resources', active.title] : ['Resources']} onBack={() => setParams({})} />
      <div className="mx-auto w-full max-w-5xl px-8 py-6 lg:px-10">
        {active ? (
          <CategoryContent categoryId={active.id} />
        ) : (
          <div className="flex flex-col gap-6">
          <p className="max-w-2xl text-sm text-text-secondary">
            Study aids to go with your words: the sounds of English, verb forms, and words and phrases in use. Everything can be played aloud.
          </p>
          {(['Pronunciation', 'Verbs', 'Words in use'] as const).map((group) => (
            <section key={group} className="flex flex-col gap-2.5">
              <h2 className="text-xs font-semibold text-text-muted">{group}</h2>
              <div className="grid gap-3 grid-cols-[repeat(auto-fill,minmax(min(100%,300px),300px))]">
                {RESOURCE_CATEGORIES.filter((c) => c.group === group).map((category) => (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => setParams({ category: category.id })}
                    disabled={category.comingSoon}
                    className={cn(
                      'btn-squish group flex flex-col gap-3 rounded-card bg-surface-1 p-4 text-left shadow-card-ring transition-colors',
                      category.comingSoon ? 'cursor-not-allowed opacity-55' : 'hover:bg-bg-200'
                    )}
                  >
                    <div className="flex w-full items-start justify-between gap-2">
                      <CategoryIcon category={category} />
                      {category.comingSoon && <span className="shrink-0 text-xs text-text-muted">Coming soon</span>}
                    </div>
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <span className="text-sm font-medium text-text-primary">{category.title}</span>
                      <span className="truncate text-xs text-text-muted">{category.subtitle}</span>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          ))}
          </div>
        )}
      </div>
    </>
  )
}
