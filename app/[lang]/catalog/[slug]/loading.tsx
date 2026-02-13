export default function ProductLoading() {
  return (
    <div className="product-page">
      <div className="container product-layout">
        <div className="product-loading-breadcrumb" aria-hidden />
        <div className="product-grid">
          <div className="product-gallery-wrap">
            <div className="product-gallery-skeleton" aria-hidden />
          </div>
          <div className="product-info">
            <div className="product-title-skeleton" aria-hidden />
            <div className="product-desc-skeleton" aria-hidden />
            <div className="product-composition-skeleton" aria-hidden />
            <div className="product-cta-skeleton" aria-hidden />
          </div>
        </div>
      </div>
    </div>
  );
}
