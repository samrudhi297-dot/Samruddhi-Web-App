export default function LegacyPageSkeleton() {
  return (
    <div className="se-page-skeleton" aria-busy="true" aria-label="Loading page">
      <div className="se-skeleton-block se-skeleton-hero">
        <div className="se-skeleton-line se-skeleton-line-lg" />
        <div className="se-skeleton-line se-skeleton-line-md" />
        <div className="se-skeleton-line se-skeleton-line-sm" />
        <div className="se-skeleton-actions">
          <div className="se-skeleton-pill" />
          <div className="se-skeleton-pill se-skeleton-pill-muted" />
        </div>
      </div>
      <div className="se-skeleton-stats">
        <div className="se-skeleton-stat" />
        <div className="se-skeleton-stat" />
        <div className="se-skeleton-stat" />
        <div className="se-skeleton-stat" />
      </div>
      <div className="se-skeleton-grid">
        <div className="se-skeleton-card" />
        <div className="se-skeleton-card" />
        <div className="se-skeleton-card" />
      </div>
    </div>
  )
}
