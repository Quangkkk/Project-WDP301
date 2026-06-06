import { useState } from 'react'
import { Link } from 'react-router-dom'
import './../../css/components.css'
import './../../css/design-system.css'
import './../../css/pages.css'

const panels = [
  ['panel-dashboard', 'Tổng quan'],
  ['panel-users', 'Users'],
  ['panel-categories', 'Categories'],
  ['panel-brands', 'Brands'],
  ['panel-products', 'Products'],
  ['panel-product-details', 'Product Details'],
]

const AdminPage = () => {
  const [activePanel, setActivePanel] = useState('panel-dashboard')

  const panelClass = (id) => `panel${activePanel === id ? ' active' : ''}`

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <Link to="/" className="logo">
          <span className="logo-mark">
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>
          </span>
          Tech<em>Home</em>
        </Link>
        <p className="text-small text-muted mb-4">Role: <span className="role-tag">Admin</span></p>
        <nav className="admin-nav">
          {panels.map(([id, label]) => (
            <a
              href={`#${id}`}
              className={activePanel === id ? 'active' : ''}
              key={id}
              onClick={(event) => {
                event.preventDefault()
                setActivePanel(id)
              }}
            >
              {label}
            </a>
          ))}
        </nav>
        <Link to="/" className="text-small text-muted" style={{ display: 'block', marginTop: 'var(--space-6)' }}>← Về cửa hàng</Link>
        <Link to="/login" className="text-small" style={{ color: 'var(--color-danger)' }}>Sign out</Link>
      </aside>

      <main className="admin-main">
        <section id="panel-dashboard" className={panelClass('panel-dashboard')}>
          <div className="page-intro">
            <h1>Admin Dashboard</h1>
            <p className="text-muted text-small">Quản lý theo use case WDP301 — chỉ giao diện demo</p>
          </div>
          <div className="stat-cards">
            <div className="stat-card"><div className="label">Users</div><div className="value">1,240</div></div>
            <div className="stat-card"><div className="label">Products</div><div className="value">387</div></div>
            <div className="stat-card"><div className="label">Categories</div><div className="value">12</div></div>
            <div className="stat-card"><div className="label">Brands</div><div className="value">28</div></div>
          </div>
          <div className="task-map card card-body">
            <h3>Phân quyền theo WDP301</h3>
            <ul>
              <li><strong>Guest:</strong> Sign in/out, xem category/brand/product</li>
              <li><strong>User:</strong> Payment, đổi MK, xem/sửa profile</li>
              <li><strong>Admin:</strong> CRUD user, category, brand, product, productDetail</li>
            </ul>
          </div>
        </section>

        <section id="panel-users" className={panelClass('panel-users')}>
          <div className="page-intro">
            <h1>Quản lý User</h1>
            <p className="use-case-list">Add user · Get all users · Get user by ID · Update user · Change user status · Delete user</p>
          </div>
          <div className="panel-toolbar">
            <input type="search" className="form-input" style={{ maxWidth: '240px' }} placeholder="Tìm user..." />
            <button type="button" className="btn btn-primary">+ Add user</button>
          </div>
          <div className="data-table-wrap">
            <table className="data-table">
              <thead><tr><th>ID</th><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                <tr><td>1</td><td>James Davidson</td><td>john@email.com</td><td>User</td><td><span className="badge badge-active">Active</span></td><td><button className="btn btn-sm btn-secondary">View</button> <button className="btn btn-sm btn-secondary">Edit</button> <button className="btn btn-sm btn-danger">Delete</button></td></tr>
                <tr><td>2</td><td>Admin System</td><td>admin@techhome.com</td><td>Admin</td><td><span className="badge badge-active">Active</span></td><td><button className="btn btn-sm btn-secondary">View</button> <button className="btn btn-sm btn-secondary">Edit</button> <button className="btn btn-sm btn-secondary">Status</button></td></tr>
                <tr><td>3</td><td>Maria Lopez</td><td>maria@email.com</td><td>User</td><td><span className="badge badge-inactive">Inactive</span></td><td><button className="btn btn-sm btn-secondary">View</button> <button className="btn btn-sm btn-secondary">Edit</button> <button className="btn btn-sm btn-danger">Delete</button></td></tr>
              </tbody>
            </table>
          </div>
          <div className="card card-body mt-4" style={{ maxWidth: '480px' }}>
            <h3 className="heading-3 mb-4">Form: Add / Update user</h3>
            <div className="form-row">
              <div className="form-group"><label className="form-label">Full name</label><input className="form-input" /></div>
              <div className="form-group"><label className="form-label">Email</label><input type="email" className="form-input" /></div>
            </div>
            <div className="form-group"><label className="form-label">Role</label><select className="form-select"><option>User</option><option>Admin</option></select></div>
            <div className="form-group"><label className="form-label">Status</label><select className="form-select"><option>Active</option><option>Inactive</option></select></div>
            <button type="button" className="btn btn-primary">Save user</button>
          </div>
        </section>

        <section id="panel-categories" className={panelClass('panel-categories')}>
          <div className="page-intro"><h1>Quản lý Category</h1><p className="use-case-list">Add · Get all (Guest/User/Admin) · Update · Delete</p></div>
          <div className="panel-toolbar"><span className="text-small text-muted">Guest/User/Admin đều xem được danh sách</span><button type="button" className="btn btn-primary">+ Add category</button></div>
          <div className="data-table-wrap">
            <table className="data-table">
              <thead><tr><th>ID</th><th>Name</th><th>Slug</th><th>Actions</th></tr></thead>
              <tbody>
                {['Laptops', 'Smartphones', 'Gaming', 'PC Components'].map((name, index) => (
                  <tr key={name}><td>{index + 1}</td><td>{name}</td><td>{name.toLowerCase().replace(' ', '-')}</td><td><button className="btn btn-sm btn-secondary">Edit</button> <button className="btn btn-sm btn-danger">Delete</button></td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section id="panel-brands" className={panelClass('panel-brands')}>
          <div className="page-intro"><h1>Quản lý Brand</h1><p className="use-case-list">Add · Get all · Update · Delete</p></div>
          <div className="panel-toolbar"><button type="button" className="btn btn-primary">+ Add brand</button></div>
          <div className="data-table-wrap">
            <table className="data-table">
              <thead><tr><th>ID</th><th>Brand</th><th>Country</th><th>Actions</th></tr></thead>
              <tbody>
                {['Apple', 'Samsung', 'ASUS'].map((brand, index) => (
                  <tr key={brand}><td>{index + 1}</td><td>{brand}</td><td>{index === 1 ? 'Korea' : index === 2 ? 'Taiwan' : 'USA'}</td><td><button className="btn btn-sm btn-secondary">Edit</button> <button className="btn btn-sm btn-danger">Delete</button></td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section id="panel-products" className={panelClass('panel-products')}>
          <div className="page-intro"><h1>Quản lý Product</h1><p className="use-case-list">Add · Get all · Get by ID · Update · Delete</p></div>
          <div className="panel-toolbar"><input type="search" className="form-input" style={{ maxWidth: '200px' }} placeholder="Search..." /><button type="button" className="btn btn-primary">+ Add product</button></div>
          <div className="data-table-wrap">
            <table className="data-table">
              <thead><tr><th>ID</th><th>Name</th><th>Category</th><th>Brand</th><th>Price</th><th>Actions</th></tr></thead>
              <tbody>
                <tr><td>101</td><td>MacBook Pro 16"</td><td>Laptops</td><td>Apple</td><td>$2,499</td><td><button className="btn btn-sm btn-secondary">View</button> <button className="btn btn-sm btn-secondary">Edit</button> <button className="btn btn-sm btn-danger">Delete</button></td></tr>
                <tr><td>102</td><td>Galaxy S26 Ultra</td><td>Smartphones</td><td>Samsung</td><td>$1,099</td><td><button className="btn btn-sm btn-secondary">View</button> <button className="btn btn-sm btn-secondary">Edit</button> <button className="btn btn-sm btn-danger">Delete</button></td></tr>
                <tr><td>103</td><td>RTX 5090</td><td>PC Components</td><td>NVIDIA</td><td>$1,999</td><td><button className="btn btn-sm btn-secondary">View</button> <button className="btn btn-sm btn-secondary">Edit</button> <button className="btn btn-sm btn-danger">Delete</button></td></tr>
              </tbody>
            </table>
          </div>
        </section>

        <section id="panel-product-details" className={panelClass('panel-product-details')}>
          <div className="page-intro"><h1>Quản lý Product Detail</h1><p className="use-case-list">Add · Get all · Update · Delete</p></div>
          <div className="panel-toolbar"><button type="button" className="btn btn-primary">+ Add product detail</button></div>
          <div className="data-table-wrap">
            <table className="data-table">
              <thead><tr><th>ID</th><th>Product</th><th>Spec / Variant</th><th>Stock</th><th>Actions</th></tr></thead>
              <tbody>
                <tr><td>1001</td><td>MacBook Pro 16"</td><td>36GB / 1TB — Space Black</td><td>24</td><td><button className="btn btn-sm btn-secondary">Edit</button> <button className="btn btn-sm btn-danger">Delete</button></td></tr>
                <tr><td>1002</td><td>MacBook Pro 16"</td><td>48GB / 2TB — Silver</td><td>8</td><td><button className="btn btn-sm btn-secondary">Edit</button> <button className="btn btn-sm btn-danger">Delete</button></td></tr>
                <tr><td>1003</td><td>Galaxy S26 Ultra</td><td>256GB — Titanium</td><td>56</td><td><button className="btn btn-sm btn-secondary">Edit</button> <button className="btn btn-sm btn-danger">Delete</button></td></tr>
              </tbody>
            </table>
          </div>
          <div className="card card-body mt-4" style={{ maxWidth: '520px' }}>
            <h3 className="heading-3 mb-4">Form: Product detail</h3>
            <div className="form-group"><label className="form-label">Product</label><select className="form-select"><option>MacBook Pro 16"</option><option>Galaxy S26 Ultra</option></select></div>
            <div className="form-group"><label className="form-label">Description / Specs</label><textarea className="form-textarea" rows="3"></textarea></div>
            <div className="form-row">
              <div className="form-group"><label className="form-label">Price</label><input type="number" className="form-input" /></div>
              <div className="form-group"><label className="form-label">Stock</label><input type="number" className="form-input" /></div>
            </div>
            <button type="button" className="btn btn-primary">Save detail</button>
          </div>
        </section>
      </main>
    </div>
  )
}

export default AdminPage
