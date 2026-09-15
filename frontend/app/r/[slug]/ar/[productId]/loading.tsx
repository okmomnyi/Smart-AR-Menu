/**
 * A guest who taps "View at real size" gets feedback immediately, instead of
 * the menu sitting unchanged while the server looks up the dish.
 *
 * The trade-off: a loading boundary streams the page, so a dish that no longer
 * exists renders the not-found page with HTTP 200 rather than 404 (Next adds a
 * noindex tag). That is acceptable here, where guests arrive by tapping inside
 * the menu. The menu route itself has no loading boundary, because guests
 * reach it from printed QR codes and a removed restaurant should answer 404.
 */
export default function ARLoading() {
  return (
    <main id="main" tabIndex={-1} className="on-dark fixed inset-0 flex flex-col bg-menu-bg">
      <div className="flex flex-1 flex-col items-center justify-center gap-3">
        <span className="spinner spinner-lg" style={{ color: 'var(--accent)' }} aria-hidden />
        <p role="status" className="text-sm text-menu-ink-muted">
          Opening the 3D view…
        </p>
      </div>
      <div className="space-y-3 rounded-t-3xl bg-menu-surface p-6">
        <div className="skeleton-dark h-7 w-48" />
        <div className="skeleton-dark h-4 w-64 max-w-full" />
        <div className="flex gap-2 pt-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton-dark h-14 w-16 rounded-xl" />
          ))}
        </div>
      </div>
    </main>
  )
}
