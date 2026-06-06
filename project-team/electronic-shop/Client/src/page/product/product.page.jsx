import { Link, useSearchParams } from 'react-router-dom'
import './../../css/components.css'
import './../../css/design-system.css'
import { PRODUCTS } from './../../js/products-data'
import { CategoryEnum } from '../../enum/category.enum'
import HeaderLayout from '../../layout/header.layout'

function formatPrice(n) {
  return '$' + n.toLocaleString();
}

const MAX_PRICE = 3000
//khi render no se khoi tao hook truoc roi moi chay
//note: init > create

const ProductPage = () => {

  //init set and get searchParams = useSearchParams()
  const [searchParams, setSearchParams] = useSearchParams()
  //get searchParams = category in url param and assign variable
  // console.log("searchParams1: ", searchParams.get('category'))

  const selectedCategory = searchParams.get('category')
  const maxPriceParam = searchParams.get('maxPrice')
  const selectedMaxPrice = maxPriceParam === null ? MAX_PRICE : Number(maxPriceParam)

  //sort product before render
  const filteredProducts = PRODUCTS.filter((product) => {
    
  const matchesCategory = selectedCategory ? product.category === selectedCategory : true
  const matchesPrice = product.price <= selectedMaxPrice

    return matchesCategory && matchesPrice
  })

  //get filters-category param - to sort product before render
  const handleCategoryChange = (category) => {
    //get filters-category param when user click 
    //create temp param: new searchParams because searchParams is function return URLSearchParams object
    const nextParams = new URLSearchParams()

    //neu selectedCategory === category thi nextParams = ''
    //neu selectedCategory !== category thi nextParams = category
    if (selectedCategory !== category) {
      nextParams.set('category', category)
    }
    setSearchParams(nextParams)
  }

  const handlePriceChange = (event) => {
    const price = Number(event.target.value)
    const nextParams = new URLSearchParams(searchParams)
    nextParams.set('maxPrice', price)
    setSearchParams(nextParams)
  }


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
    <>
      {/* <!-- Header body--> */}
      <HeaderLayout />

      {/* <!-- Header page--> */}
      <div className="page-header">
        <div className="container">
          <nav className="breadcrumb"><Link to="/">Home</Link> / {selectedCategory || "All product"}</nav>
          <h1>All {selectedCategory?.toLocaleLowerCase() || null} products</h1>
          <p className="text-muted text-small">Laptops, smartphones &amp; gadgets</p>
        </div>
      </div>

      {/* <!-- body --> */}
      <main className="container listing-layout">

        <aside className="filter-sidebar">
          <h3 className="heading-3" style={{ marginBottom: '1rem' }}>Filters</h3>
          <div className="filter-group">
            <h3>Category</h3>
            <label className="filter-option"><input type="checkbox" checked={selectedCategory === 'Laptops'} onChange={() => handleCategoryChange('Laptops')} /> Laptops</label>
            <label className="filter-option"><input type="checkbox" checked={selectedCategory === 'Smartphones'} onChange={() => handleCategoryChange('Smartphones')} /> Smartphones</label>
            <label className="filter-option"><input type="checkbox" checked={selectedCategory === CategoryEnum.gadgets} onChange={() => handleCategoryChange(CategoryEnum.gadgets)} /> Gadgets</label>
          </div>
          <div className="filter-group">
            <h3>Price</h3>
            <input
              type="range"
              className="form-input"
              min="0"
              max={MAX_PRICE}
              value={selectedMaxPrice}
              onChange={handlePriceChange}
              style={{ width: '100%' }}
            />
            <p className="text-small text-muted" style={{ marginTop: '0.5rem' }}>
              Up to {formatPrice(selectedMaxPrice)}
            </p>
          </div>
        </aside>

        <div>
          <div className="listing-toolbar">
            <span className="text-small text-muted">{filteredProducts.length} products</span>
            <select className="sort-select"><option>Sort: Featured</option><option>Price: Low to High</option><option>Price: High to Low</option></select>
          </div>
          <div className="products-grid" id="listing-grid">
            {filteredProducts.map(renderProductCard)}
          </div>
          <nav className="pagination"><span className="active">1</span><a href="#">2</a></nav>
        </div>
      </main>

      {/* <!-- Footer --> */}
      <footer className="site-footer"><div className="container footer-bottom">© 2026 TechHome</div></footer>
    </>
  )
}

export default ProductPage
