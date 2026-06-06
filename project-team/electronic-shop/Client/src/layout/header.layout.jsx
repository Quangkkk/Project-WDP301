import { Link } from 'react-router-dom'

// import './../css/components.css'

const HeaderLayout = () => {
    return (
        <>
            {/* <!-- News --> */}
            <div className="promo-strip">Free shipping on orders over <strong>$99</strong> · New laptops &amp; smartphones in stock</div>

            {/* <!-- Header --> */}
            <header className="site-header">
                <div className="container header-inner">
                    <Link to="/" className="logo">
                        <span className="logo-mark">
                            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>
                        </span>
                        Tech<em>Home</em>
                    </Link>
                    <nav className="nav-main">

                        {/* <Links> */}
                        <Link to="/" className="active">Home</Link>
                        <Link to="/product?category=Laptops">Laptops</Link>
                        <Link to="/product?category=Smartphones">Smartphones</Link>
                        <Link to="/product?category=Gadgets">Gadgets</Link>
                        {/* </Links> */}
                    </nav>
                    <div className="header-search header-search-wrap">
                        <input type="search" placeholder="Search products..." aria-label="Search" />
                    </div>
                    <div className="header-actions">
                        <Link to="/login" className="btn btn-ghost btn-sm">Sign in</Link>
                        <Link to="/cart" className="icon-link" aria-label="Cart">
                            <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M6 6h15l-1.5 9h-12z" /><circle cx="9" cy="20" r="1" /><circle cx="18" cy="20" r="1" /></svg>
                            <span className="cart-count">2</span>
                        </Link>
                    </div>
                </div>
            </header>
        </>
    )
}

export default HeaderLayout
