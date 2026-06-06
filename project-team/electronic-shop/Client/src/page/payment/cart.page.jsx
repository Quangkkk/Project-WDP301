import { useState } from 'react'
import { Link } from 'react-router-dom'
import './../../css/components.css'
import './../../css/design-system.css'

const initialItems = [
  { id: 1, emoji: '💻', name: 'MacBook Pro 16"', details: 'Space Black · 1TB', price: 2499 },
  { id: 2, emoji: '📱', name: 'iPhone 17 Pro Max', details: '256GB', price: 1199 },
]

const formatPrice = (price) => '$' + price.toLocaleString()

const CartPage = () => {
  const [quantities, setQuantities] = useState({ 1: 1, 2: 1 })

  const updateQuantity = (id, amount) => {
    setQuantities((current) => ({
      ...current,
      [id]: Math.min(99, Math.max(1, current[id] + amount)),
    }))
  }

  const total = initialItems.reduce((sum, item) => sum + item.price * quantities[item.id], 0)

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
          <Link to="/product" className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto' }}>Continue shopping</Link>
        </div>
      </header>

      <main className="container">
        <h1 className="heading-2" style={{ padding: '2rem 0 1rem' }}>Your cart</h1>
        <div className="cart-layout">
          <div>
            {initialItems.map((item) => (
              <div className="cart-item" key={item.id}>
                <div className="cart-item-thumb">{item.emoji}</div>
                <div><strong>{item.name}</strong><p className="text-small text-muted">{item.details}</p></div>
                <div className="qty-selector">
                  <button type="button" onClick={() => updateQuantity(item.id, -1)}>−</button>
                  <input value={quantities[item.id]} readOnly />
                  <button type="button" onClick={() => updateQuantity(item.id, 1)}>+</button>
                </div>
                <strong>{formatPrice(item.price * quantities[item.id])}</strong>
              </div>
            ))}
          </div>
          <aside className="order-summary">
            <h3>Summary</h3>
            <div className="summary-row"><span>Subtotal</span><span>{formatPrice(total)}</span></div>
            <div className="summary-row total"><span>Total</span><span>{formatPrice(total)}</span></div>
            <Link to="/checkout" className="btn btn-primary btn-block" style={{ marginTop: '1.25rem' }}>Checkout</Link>
          </aside>
        </div>
      </main>
    </>
  )
}

export default CartPage
