const PRODUCTS = [
  { id: 1, name: 'MacBook Pro 16" M4', category: 'Laptops', emoji: '💻', price: 2499, oldPrice: 2699, badge: 'new' },
  { id: 2, name: 'ASUS Zenbook 14 OLED', category: 'Laptops', emoji: '💻', price: 1299 },
  { id: 3, name: 'Dell XPS 15', category: 'Laptops', emoji: '💻', price: 1899, oldPrice: 2099, badge: 'sale' },
  { id: 4, name: 'Lenovo ThinkPad X1', category: 'Laptops', emoji: '💻', price: 1649 },
  { id: 5, name: 'iPhone 17 Pro Max', category: 'Smartphones', emoji: '📱', price: 1199, badge: 'new' },
  { id: 6, name: 'Samsung Galaxy S26', category: 'Smartphones', emoji: '📱', price: 999, oldPrice: 1149, badge: 'sale' },
  { id: 7, name: 'Google Pixel 10 Pro', category: 'Smartphones', emoji: '📱', price: 899 },
  { id: 8, name: 'OnePlus 14', category: 'Smartphones', emoji: '📱', price: 749 },
  { id: 9, name: 'Sony WH-1000XM6', category: 'Gadgets', emoji: '🎧', price: 349 },
  { id: 10, name: 'iPad Pro M4', category: 'Gadgets', emoji: '📲', price: 1099 },
];

function formatPrice(n) {
  return '$' + n.toLocaleString();
}

function productCardHTML(p) {
  const badge = p.badge === 'new'
    ? '<span class="badge badge-new product-card__badge">New</span>'
    : p.badge === 'sale'
      ? '<span class="badge badge-sale product-card__badge">Sale</span>'
      : '';
  const was = p.oldPrice ? `<span class="was">${formatPrice(p.oldPrice)}</span>` : '';

  return `
    <article class="product-card">
      <div class="product-card__media">
        ${badge}
        <span class="emoji">${p.emoji}</span>
      </div>
      <div class="product-card__body">
        <span class="product-card__cat">${p.category}</span>
        <h3 class="product-card__title"><a href="product-detail.html?id=${p.id}">${p.name}</a></h3>
        <div class="product-card__price">
          <span class="now">${formatPrice(p.price)}</span>
          ${was}
        </div>
        <a href="cart.html" class="btn btn-primary btn-add">Add to Cart</a>
      </div>
    </article>
  `;
}

function renderProductCards(containerId, products) {
  const el = document.getElementById(containerId);
  if (el) el.innerHTML = products.map(productCardHTML).join('');
}
