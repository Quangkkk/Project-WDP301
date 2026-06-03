import { Link } from 'react-router-dom'
import './../../css/components.css'
import './../../css/design-system.css'
import './../../css/pages.css'

const LoginPage = () => {
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
        </div>
      </header>

      <main className="auth-layout auth-layout--center">
        <div className="auth-card">
          <form className="auth-form">
            <h1>Đăng nhập</h1>
            <p className="subtitle">Guest đăng nhập để trở thành User</p>
            <div className="form-group"><label className="form-label">Email</label><input type="email" className="form-input" required /></div>
            <div className="form-group"><label className="form-label">Mật khẩu</label><input type="password" className="form-input" required /></div>
            <p className="text-small mb-4"><Link to="/forgot-password" style={{ color: 'var(--blue)' }}>Forgot password?</Link></p>
            <Link to="/profile" className="btn btn-primary btn-block">Sign in</Link>
            <p className="text-center text-small text-muted mt-4">Chưa có tài khoản? <Link to="/register" style={{ color: 'var(--blue)' }}>Đăng ký</Link></p>
            <p className="text-center text-small mt-4"><Link to="/admin" className="text-muted">Admin login →</Link></p>
          </form>
        </div>
      </main>
    </>
  )
}

export default LoginPage
