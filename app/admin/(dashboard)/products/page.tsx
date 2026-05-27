export default function AdminProductsIndexPage() {
  return (
    <div className="admin-products-studio-empty">
      <span className="material-symbols-outlined admin-products-studio-empty-icon" aria-hidden>
        inventory_2
      </span>
      <h2>Select a product</h2>
      <p className="admin-hint">
        Choose a bouquet or gift from the left shelf, or use the <strong>+</strong> button to create
        a new listing.
      </p>
    </div>
  );
}
