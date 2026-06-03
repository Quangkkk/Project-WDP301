import { Link } from 'react-router-dom'
import './../../css/components.css'
import './../../css/design-system.css'
import axios from "axios";

const data = {
    buyerName: "lvhm",
    buyerEmail: "email@gmail.com",
    buyerPhone: "phone",
    buyer: "phone",
    price: 10000,
    userId: "6a1f0b55107a2e35a6754c2a"
}

const CheckoutPage = () => {

  const handlePlaceOrder = (e) => {
    if (e && e.preventDefault) e.preventDefault();
``
      axios
      .post("http://localhost:8080/payment/create-payment-link", data)
      // .get("http://localhost:8080/product/")
      .then((response) => {
          console.log(response)
          console.log(response.data);
          
            window.location.href = response.data.link;
      })
      .catch((error) => {
        console.error("Error fetching Courts:", error);
        // toast.error("Failed to fetch Courts");
      });
    console.log('Place order clicked');
    // alert('Order placed (demo).');
  }


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
          <span className="text-small text-muted" style={{ marginLeft: 'auto' }}>Secure checkout</span>
        </div>
      </header>

      <main className="container">
        <h1 className="heading-2" style={{ padding: '2rem 0 1rem' }}>Checkout</h1>
        <div className="checkout-layout">
          <div>
            <section className="checkout-section">
              <h2>Shipping</h2>
              <div className="form-row">
                <div className="form-group"><label className="form-label">First name</label><input className="form-input" /></div>
                <div className="form-group"><label className="form-label">Last name</label><input className="form-input" /></div>
              </div>
              <div className="form-group"><label className="form-label">Address</label><input className="form-input" /></div>
            </section>
            <section className="checkout-section">
              <h2>Payment</h2>
              <div className="payment-methods">
                <div className="payment-option"><input type="radio" name="payment" id="card" defaultChecked /><label htmlFor="card">PAYOS</label></div>
                <div className="payment-option"><input type="radio" name="payment" id="paypal" /><label htmlFor="paypal">PayPal</label></div>
              </div>
            </section>
          </div>
          <aside className="order-summary">
            <h3>Order summary</h3>
            <div className="summary-row"><span>Subtotal</span><span>$3,698</span></div>
            <div className="summary-row"><span>Shipping</span><span>Free</span></div>
            <div className="summary-row total"><span>Total</span><span>$3,698</span></div>
            <button type="button" onClick={handlePlaceOrder} className="btn btn-primary btn-block" style={{ marginTop: '1.25rem' }}>Place order</button>
          </aside>
        </div>
      </main>
    </>
  )
}

export default CheckoutPage
