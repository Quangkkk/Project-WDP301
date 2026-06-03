import { Link } from 'react-router-dom'
import './../../css/components.css'
import './../../css/design-system.css'

const ForgotPasswordPage = () => {
  return (
    <>
      <header className="site-header">
        <div className="container header-inner">
          <Link to="/" className="logo"><span className="logo-icon">T</span> Tech<em>Home</em></Link>
        </div>
      </header>
      <div className="auth-layout">
        <div className="auth-panel-left">
          <h2>Forgot password</h2>
          <p className="text-muted">Use case: <strong>Forgot your password</strong> (User, Admin)</p>
        </div>
        <div className="auth-form-panel">
          <form className="auth-form">
            <h1>Quên mật khẩu</h1>
            <p className="subtitle">Nhập email để nhận link đặt lại mật khẩu</p>
            <div className="form-group"><label className="form-label">Email</label><input type="email" className="form-input" required /></div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Gửi link</button>
            <p className="text-center text-small mt-4"><Link to="/login">← Sign in</Link></p>
          </form>
        </div>
      </div>
    </>
  )
}

export default ForgotPasswordPage
