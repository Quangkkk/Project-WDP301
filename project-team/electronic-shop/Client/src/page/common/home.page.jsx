import { Link } from 'react-router-dom'
import './../../css/components.css'
import './../../css/design-system.css'
import './../../css/pages.css'
import HeaderLayout from '../../layout/header.layout'
import FooterLayout from '../../layout/footer.layout'
import { PRODUCTS } from './../../js/products-data'

const formatPrice = (price) => '$' + price.toLocaleString()

const HomePage = () => {
  //tra ve cac san pham co category la laptop
  const laptops = PRODUCTS.filter((product) => product.category === 'Laptops')
    //tra ve cac san pham co category la smartphone
  const phones = PRODUCTS.filter((product) => product.category === 'Smartphones')

  const renderProductCard = (product) => (
    <article className="product-card" key={(product.id)}>
      <div className="product-card__media">
        {product.badge === 'new' && <span className="badge badge-new product-card__badge">New</span>}
        {product.badge === 'sale' && <span className="badge badge-sale product-card__badge">Sale</span>}
        <span className="emoji">{product.emoji}</span>
      </div>
      <div className="product-card__body">
        <span className="product-card__cat">{product.category}</span>
        <h3 className="product-card__title">
          <Link to={`/product-detail?id=${product.id}`}>{product.name}</Link>
        </h3>
        <div className="product-card__price">
          <span className="now">{formatPrice(product.price)}</span>
          {product.oldPrice && <span className="was">{formatPrice(product.oldPrice)}</span>}
        </div>
        <Link to="/cart" className="btn btn-primary btn-add">Add to Cart</Link>
      </div>
    </article>
  )

  return (
    <div className="container">
      {/* <!-- Header --> */}
      <HeaderLayout/>

      <main>
        {/* <!-- Hero 16:9 — glowing laptop --> */}
        <section className="hero-premium">
          <div className="container">
            <div className="hero-copy">
              <span className="eyebrow">New Collection 2026</span>
              <h1>Power meets <span>elegance</span></h1>
              <p>Discover premium laptops and smartphones. Minimal design, maximum performance — crafted for modern life.</p>
              <div className="hero-actions">
                <Link to="/product" className="btn btn-primary btn-lg">Shop Laptops</Link>
                <Link to="/product?cat=phones" className="btn btn-secondary btn-lg">Browse Phones</Link>
              </div>
            </div>
            <div className="hero-stage">
              <div className="hero-glow" aria-hidden="true"></div>
              <svg className="hero-laptop" viewBox="0 0 560 320" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Premium laptop">
                <defs>
                  <linearGradient id="screen" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style={{ stopColor: '#0b6fff' }} />
                    <stop offset="100%" style={{ stopColor: '#60a5fa' }} />
                  </linearGradient>
                  <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="8" result="blur" />
                    <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                  </filter>
                </defs>
                {/* <!-- Base --> */}
                <rect x="40" y="200" width="480" height="16" rx="4" fill="#e4e4e7" />
                <path d="M120 216 H440 L420 240 H140 Z" fill="#d4d4d8" />
                {/* <!-- Screen lid --> */}
                <rect x="80" y="40" width="400" height="260" rx="12" fill="#27272a" filter="url(#glow)" />
                <rect x="96" y="56" width="368" height="228" rx="8" fill="url(#screen)" />
                {/* <!-- Screen shine --> */}
                <rect x="96" y="56" width="368" height="80" rx="8" fill="white" opacity="0.12" />
                {/* <!-- Logo dot --> */}
                <circle cx="280" cy="170" r="24" fill="white" opacity="0.15" />
                <circle cx="280" cy="170" r="8" fill="white" opacity="0.4" />
              </svg>
            </div>
          </div>
        </section>

        {/* <!-- Categories --> */}
        <section className="section section--gray">
          <div className="container">
            <div className="section-head">
              <h2>Shop by category</h2>
              <p>Laptops, smartphones &amp; smart gadgets — all in one place</p>
            </div>
            <div className="category-pills">
              <Link to="/product" className="category-pill">Laptops <span>48 items</span></Link>
              <Link to="/product?cat=phones" className="category-pill">Smartphones <span>62 items</span></Link>
              <Link to="/product" className="category-pill">Tablets <span>18 items</span></Link>
              <Link to="/product" className="category-pill">Accessories <span>120+ items</span></Link>
            </div>
          </div>
        </section>

        {/* <!-- Laptops grid --> */}
        <section className="section">
          <div className="container">
            <div className="section-head">
              <h2>Featured laptops</h2>
              <p>High-performance machines for work and creativity</p>
            </div>
            <div className="products-grid" id="laptops-grid">
              {laptops.map(renderProductCard)}
            </div>
          </div>
        </section>

        {/* <!-- Smartphones grid --> */}
        <section className="section section--gray">
          <div className="container">
            <div className="section-head">
              <h2>Latest smartphones</h2>
              <p>Flagship devices with stunning displays and cameras</p>
            </div>
            <div className="products-grid" id="phones-grid">
              {phones.map(renderProductCard)}
            </div>
            <p className="text-center mt-4">
              <Link to="/product" className="btn btn-secondary">View all products</Link>
            </p>
          </div>
        </section>

        {/* <!-- Trust --> */}
        <section className="section" style={{ paddingTop: 0 }}>
          <div className="container trust-row">
            <div className="trust-item"><strong>Free delivery</strong><span>On orders $99+</span></div>
            <div className="trust-item"><strong>2-year warranty</strong><span>Official coverage</span></div>
            <div className="trust-item"><strong>Secure checkout</strong><span>SSL encrypted</span></div>
            <div className="trust-item"><strong>24/7 support</strong><span>Expert help</span></div>
          </div>
        </section>
      </main>

     
      <FooterLayout/>

    </div>
  )
}

export default HomePage
