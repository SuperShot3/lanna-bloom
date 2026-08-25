export default function LangLoading() {
  return (
    <div className="lang-route-skeleton" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading</span>
      <div className="lang-route-skeleton__hero" aria-hidden />
      <div className="lang-route-skeleton__line" aria-hidden />
      <div className="lang-route-skeleton__line lang-route-skeleton__line--short" aria-hidden />
      <div className="lang-route-skeleton__grid" aria-hidden>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="lang-route-skeleton__card" />
        ))}
      </div>
    </div>
  );
}
