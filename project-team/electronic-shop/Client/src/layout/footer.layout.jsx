


import { Link } from 'react-router-dom'

const FooterLayout = () => {
  return (
    <>
      {/* <!-- Footer --> */}

      <footer className="site-footer">
        <div className="container">
          <div className="footer-grid">
            <div>
              <Link to="/" className="logo"><span className="logo-mark"><svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg></span> Tech<em>Home</em></Link>
              <p className="text-small text-muted" style={{ marginTop: '1rem', maxWidth: '260px' }}>Modern electronics store. Clean, intuitive shopping for laptops and smartphones.</p>
            </div>
            <div className="footer-col">
              <h4>Shop</h4>
              <Link to="/product">All products</Link>
              <Link to="/product">Laptops</Link>
              <Link to="/product?cat=phones">Smartphones</Link>
            </div>
            <div className="footer-col">
              <h4>Account</h4>
              <Link to="/login">Sign in</Link>
              <Link to="/register">Register</Link>
              <Link to="/cart">Cart</Link>
            </div>
            <div className="footer-col">
              <h4>Support</h4>
              <a href="#">Contact</a>
              <a href="#">Shipping</a>
              <Link to="/admin">Admin</Link>
            </div>
          </div>
          <div className="footer-bottom">© 2026 TechHome. All rights reserved.</div>
        </div>
      </footer>
    </>
  )
}

export default FooterLayout
