import { Link } from 'react-router-dom'
import './../../css/components.css'
import './../../css/design-system.css'

const ProfilePage = () => {
  return (
    <>
      <header className="site-header">
        <div className="container header-inner">
          <Link to="/" className="logo"><span className="logo-icon">T</span> Tech<em>Home</em></Link>
          <div className="header-actions" style={{ marginLeft: 'auto' }}>
            <span className="role-tag">User</span>
            <Link to="/login" className="btn btn-ghost btn-sm">Sign out</Link>
          </div>
        </div>
      </header>

      <div className="dashboard-layout">
        <aside className="dashboard-sidebar">
          <nav className="dashboard-nav">
            <a href="#profile" className="active">Thông tin (Get by ID)</a>
            <a href="#update">Cập nhật (Update user)</a>
            <a href="#password">Đổi MK (Change password)</a>
            <Link to="/checkout">Thanh toán (Payment)</Link>
            <Link to="/login" style={{ color: 'var(--color-danger)' }}>Sign out</Link>
          </nav>
        </aside>
        <main className="dashboard-main">
          <h1 className="heading-2 mb-4">Xin chào, James Davidson</h1>
          <p className="text-small text-muted mb-6">User ID: 1 · Use case: Get user by ID, Update user, Change password, Delete user (tự xóa)</p>

          <div className="card card-body mb-4" id="profile">
            <h2 className="heading-3 mb-4">Thông tin tài khoản</h2>
            <div className="form-row">
              <div className="form-group"><label className="form-label">Họ tên</label><input className="form-input" defaultValue="James Davidson" /></div>
              <div className="form-group"><label className="form-label">Email</label><input className="form-input" defaultValue="john@email.com" readOnly /></div>
            </div>
            <div className="form-group"><label className="form-label">SĐT</label><input className="form-input" defaultValue="0901234567" /></div>
            <button type="button" className="btn btn-primary">Update user</button>
          </div>

          <div className="card card-body mb-4" id="password">
            <h2 className="heading-3 mb-4">Change your password</h2>
            <div className="form-group"><label className="form-label">Mật khẩu hiện tại</label><input type="password" className="form-input" /></div>
            <div className="form-group"><label className="form-label">Mật khẩu mới</label><input type="password" className="form-input" /></div>
            <button type="button" className="btn btn-primary">Đổi mật khẩu</button>
          </div>

          <div className="card card-body">
            <h2 className="heading-3 mb-4">Đơn hàng gần đây</h2>
            <div className="data-table-wrap">
              <table className="data-table">
                <thead><tr><th>Mã đơn</th><th>Ngày</th><th>Tổng</th><th></th></tr></thead>
                <tbody>
                  <tr><td>#TH-1847</td><td>18/05/2026</td><td>$2,848</td><td><a href="#">Chi tiết</a></td></tr>
                  <tr><td>#TH-1723</td><td>02/04/2026</td><td>$2,278</td><td><a href="#">Chi tiết</a></td></tr>
                </tbody>
              </table>
            </div>
            <Link to="/checkout" className="btn btn-secondary mt-4">Payment — Thanh toán đơn mới</Link>
            <button type="button" className="btn btn-danger mt-4" style={{ marginLeft: 'var(--space-3)' }}>Delete user (tài khoản)</button>
          </div>
        </main>
      </div>
    </>
  )
}

export default ProfilePage
