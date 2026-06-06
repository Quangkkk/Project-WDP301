import { Link, useSearchParams } from 'react-router-dom'
import './../../css/components.css'
import './../../css/design-system.css'
import { PRODUCTS } from './../../js/products-data'

const formatPrice = (price) => '$' + price.toLocaleString()

const ProductDetailPage = () => {
  const [searchParams] = useSearchParams()
  const productId = Number(searchParams.get('id')) || 1
  const product = PRODUCTS.find((item) => item.id === productId) || PRODUCTS[0]

  return (
    <>
      <header className="site-header">
        <div className="container header-inner">
          <Link to="/" className="logo">
            <span className="logo-mark">
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>
            </span>
            Tech<em>Home</em>
          </Link>
          <div className="header-actions" style={{ marginLeft: 'auto' }}>
            <Link to="/cart" className="btn btn-primary btn-sm">Cart (2)</Link>
          </div>
        </div>
      </header>

      <main className="container">
        <nav className="breadcrumb" style={{ padding: '1.5rem 0 0' }}><Link to="/">Home</Link> / <Link to="/product">{product.category}</Link> / {product.name}</nav>
        <div className="product-detail-grid">
          <div className="gallery-main">{product.emoji}</div>
          <div>
            {product.badge === 'new' && <span className="badge badge-new">New</span>}
            {product.badge === 'sale' && <span className="badge badge-sale">Sale</span>}
            <h1 className="heading-2" style={{ margin: '1rem 0' }}>{product.name}</h1>
            <p className="text-muted text-small">Premium {product.category.toLowerCase()} · TechHome</p>
            <p className="product-card__price" style={{ margin: '1.5rem 0' }}>
              <span className="now" style={{ fontSize: '2rem' }}>{formatPrice(product.price)}</span>
              {product.oldPrice && <span className="was">{formatPrice(product.oldPrice)}</span>}
            </p>
            <p className="text-muted" style={{ marginBottom: '1.5rem' }}>High-performance design, crisp display, long battery life, and reliable everyday speed.</p>
            <table className="specs-table">
              <tbody>
                <tr><td>Category</td><td>{product.category}</td></tr>
                <tr><td>Condition</td><td>New</td></tr>
                <tr><td>Warranty</td><td>2 years</td></tr>
                <tr><td>Availability</td><td>In stock</td></tr>
              </tbody>
            </table>
            <div className="flex gap-4">
              <Link to="/cart" className="btn btn-primary btn-lg">Add to Cart</Link>
              <Link to="/checkout" className="btn btn-secondary btn-lg">Buy Now</Link>
            </div>
          </div>
        </div>
      </main>
    </>
  )
}

export default ProductDetailPage
