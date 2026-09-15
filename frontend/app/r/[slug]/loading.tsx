/**
 * Shown the moment a guest opens a menu, while the server fetches it. Mirrors
 * the real layout so nothing jumps when the dishes arrive.
 */
export default function MenuLoading() {
  return (
    <div className="on-dark flex min-h-screen flex-col bg-menu-bg">
      <div className="flex items-center gap-3 border-b border-menu-border px-4 py-3">
        <div className="skeleton-dark h-9 w-9 rounded-full" />
        <div className="skeleton-dark h-5 w-40" />
      </div>

      <div className="flex gap-2 overflow-hidden border-b border-menu-border px-4 py-3">
        {[56, 76, 64, 84, 70].map((width) => (
          <div key={width} className="skeleton-dark h-9 shrink-0 rounded-full" style={{ width }} />
        ))}
      </div>

      <main id="main" tabIndex={-1} className="grid flex-1 grid-cols-2 content-start gap-4 p-4 md:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="overflow-hidden rounded-xl border border-menu-border">
            <div className="skeleton-dark aspect-square rounded-none" />
            <div className="space-y-2 p-4">
              <div className="skeleton-dark h-4 w-3/4" />
              <div className="skeleton-dark h-3 w-full" />
              <div className="skeleton-dark h-9 w-full rounded-full" />
            </div>
          </div>
        ))}
        <p className="sr-only" role="status">
          Loading the menu
        </p>
      </main>
    </div>
  )
}
