import { useEffect, useMemo, useState } from 'react'
import Container from 'react-bootstrap/Container'
import Row from 'react-bootstrap/Row'
import Col from 'react-bootstrap/Col'
import Card from 'react-bootstrap/Card'
import Form from 'react-bootstrap/Form'
import { useLocation, useNavigate } from 'react-router-dom'
import MainLayout from '../../components/templates/MainLayout'
import PageHeader from '../../components/templates/PageHeader'
import Alert from '../../components/atoms/Alert'
import Button from '../../components/atoms/Button'
import EmptyState from '../../components/atoms/EmptyState'
import LoadingText from '../../components/atoms/LoadingText'
import PriceText from '../../components/atoms/PriceText'
import SelectField from '../../components/atoms/SelectField'
import TextAreaField from '../../components/atoms/TextAreaField'
import TextField from '../../components/atoms/TextField'
import { getErrorMessage } from '../../services/api'
import { getCart } from '../../services/cart.service'
import { validateCoupon } from '../../services/coupon.service'
import { createOrder } from '../../services/order.service'
import { getShippingMethods } from '../../services/shipping.service'
import { getCurrentUser, getUserId } from '../../utils/authStorage'
import { getCartIdentity } from '../../utils/sessionCart'
import { formatCurrency, getId, pickArray } from '../../utils/format'

const initialForm = {
  receiver_name: '',
  receiver_phone: '',
  address_province: '',
  address_district: '',
  address_ward: '',
  address_address_line: '',
  note: '',
  payment_method: 'cod',
  shipping_method_id: '',
  coupon_code: '',
}

function CheckoutPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const user = getCurrentUser()
  const [form, setForm] = useState({ ...initialForm, receiver_name: user?.name || '', receiver_phone: user?.phone || '' })
  const [items, setItems] = useState([])
  const [cart, setCart] = useState(null)
  const [shippingMethods, setShippingMethods] = useState([])
  const [discount, setDiscount] = useState(0)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const subtotal = useMemo(() => items.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0), [items])
  const selectedShipping = shippingMethods.find((item) => getId(item) === form.shipping_method_id) || shippingMethods[0]
  const shippingFee = Number(selectedShipping?.base_fee || 0)
  const total = Math.max(subtotal + shippingFee - discount, 0)

  useEffect(() => {
    let mounted = true

    const load = async () => {
      try {
        setIsLoading(true)
        setError('')

        const [cartRes, shippingRes] = await Promise.all([
          getCart(getCartIdentity(user)),
          getShippingMethods({ is_active: true }),
        ])

        if (!mounted) return

        const cartData = cartRes?.data || {}
        const methods = pickArray(shippingRes, [])

        setCart(cartData.cart || null)
        setItems(cartData.items || [])
        setShippingMethods(methods)
        setForm((prev) => ({ ...prev, shipping_method_id: getId(methods[0]) || '' }))
      } catch (error) {
        if (!mounted) return
        setCart(null)
        setItems([])
        setShippingMethods([])
        setError(getErrorMessage(error, 'Không tải được checkout data từ backend.'))
      } finally {
        if (mounted) setIsLoading(false)
      }
    }

    load()
    return () => { mounted = false }
  }, [])

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    if (name === 'coupon_code') setDiscount(0)
  }

  const handleApplyCoupon = async () => {
    if (!form.coupon_code.trim()) return

    try {
      setError('')
      setMessage('')

      const response = await validateCoupon({
        coupon_code: form.coupon_code.trim(),
        code: form.coupon_code.trim(),
        user_id: getUserId(user),
        subtotal,
      })

      const data = response?.data || response
      setDiscount(Number(data.discountAmount || data.discount_amount || 0))
      setMessage('Áp dụng coupon thành công.')
    } catch (error) {
      setDiscount(0)
      setError(getErrorMessage(error, 'Coupon không hợp lệ'))
    }
  }

  const validate = () => {
    if (!user) return 'Backend hiện tại yêu cầu đăng nhập để tạo order. Vui lòng login trước khi checkout.'
    const required = ['receiver_name', 'receiver_phone', 'address_province', 'address_district', 'address_ward', 'address_address_line']
    for (const field of required) if (!form[field].trim()) return 'Vui lòng nhập đầy đủ thông tin giao hàng.'
    if (!items.length) return 'Giỏ hàng đang trống.'
    return ''
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    const validationMessage = validate()
    if (validationMessage) { setError(validationMessage); return }

    try {
      setIsSubmitting(true)
      setError('')

      const payload = {
        user_id: getUserId(user),
        shipping_method_id: form.shipping_method_id || undefined,
        receiver_name: form.receiver_name,
        receiver_phone: form.receiver_phone,
        address_province: form.address_province,
        address_district: form.address_district,
        address_ward: form.address_ward,
        address_address_line: form.address_address_line,
        payment_method: form.payment_method,
        coupon_code: form.coupon_code.trim() || undefined,
        cart_id: location.state?.cartId || getId(cart),
        items: items.map((item) => ({
          product_id: getId(item.product_id),
          variant_id: getId(item.variant_id),
          quantity: Number(item.quantity || 1),
        })),
      }

      await createOrder(payload)
      navigate('/orders', { replace: true })
    } catch (error) {
      setError(getErrorMessage(error, 'Không tạo được đơn hàng'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <MainLayout>
      <PageHeader eyebrow='Checkout' title='Place Order' description='Cart, shipping method, coupon và order đều gọi từ backend.' />
      <section className='page-section'>
        <Container>
          <Alert type='danger'>{error}</Alert>
          <Alert type='success'>{message}</Alert>
          {isLoading ? <LoadingText /> : items.length === 0 ? <EmptyState icon='🛒' title='Không có sản phẩm để checkout' actionLabel='Back to products' onAction={() => navigate('/products')} /> : (
            <Form onSubmit={handleSubmit}>
              <Row className='g-4'>
                <Col lg={8}>
                  <Card className='card-surface mb-4'><Card.Body className='p-4'>
                    <h3 className='mb-4 text-2xl font-black text-slate-950'>Shipping Information</h3>
                    <Row className='g-3'>
                      <Col md={6}><TextField label='Receiver name' name='receiver_name' value={form.receiver_name} onChange={handleChange} /></Col>
                      <Col md={6}><TextField label='Phone number' name='receiver_phone' value={form.receiver_phone} onChange={handleChange} /></Col>
                      <Col md={4}><TextField label='Province/City' name='address_province' value={form.address_province} onChange={handleChange} /></Col>
                      <Col md={4}><TextField label='District' name='address_district' value={form.address_district} onChange={handleChange} /></Col>
                      <Col md={4}><TextField label='Ward' name='address_ward' value={form.address_ward} onChange={handleChange} /></Col>
                      <Col xs={12}><TextField label='Address line' name='address_address_line' value={form.address_address_line} onChange={handleChange} /></Col>
                      <Col xs={12}><TextAreaField label='Order note' name='note' value={form.note} onChange={handleChange} /></Col>
                    </Row>
                  </Card.Body></Card>
                  <Card className='card-surface'><Card.Body className='p-4'>
                    <h3 className='mb-4 text-2xl font-black text-slate-950'>Payment & Delivery</h3>
                    <Row className='g-3'>
                      <Col md={6}><SelectField label='Shipping method' name='shipping_method_id' value={form.shipping_method_id} onChange={handleChange} options={shippingMethods.length ? shippingMethods.map((item) => ({ value: getId(item), label: `${item.name} - ${formatCurrency(item.base_fee)}` })) : [{ value: '', label: 'No shipping method from backend' }]} /></Col>
                      <Col md={6}><SelectField label='Payment method' name='payment_method' value={form.payment_method} onChange={handleChange} options={[{ value: 'cod', label: 'Cash on Delivery' }, { value: 'bank_transfer', label: 'Bank Transfer' }]} /></Col>
                    </Row>
                  </Card.Body></Card>
                </Col>
                <Col lg={4}>
                  <Card className='card-surface sticky-top' style={{ top: 96 }}><Card.Body className='p-4'>
                    <h3 className='mb-4 text-2xl font-black text-slate-950'>Order Review</h3>
                    {items.map((item) => <div key={item._id || item.id} className='d-flex justify-content-between gap-3 border-bottom py-2'><span className='text-sm text-slate-600'>{item.product_id?.name} x {item.quantity}</span><PriceText value={Number(item.price) * Number(item.quantity)} className='text-sm font-bold' /></div>)}
                    <div className='mt-3 d-flex gap-2'><TextField name='coupon_code' placeholder='Coupon code' value={form.coupon_code} onChange={handleChange} className='flex-grow-1' /><Button type='button' variant='secondary' onClick={handleApplyCoupon}>Apply</Button></div>
                    <div className='mt-4 d-flex justify-content-between'><span className='text-slate-500'>Subtotal</span><PriceText value={subtotal} className='font-bold' /></div>
                    <div className='mt-2 d-flex justify-content-between'><span className='text-slate-500'>Shipping</span><PriceText value={shippingFee} className='font-bold' /></div>
                    <div className='mt-2 d-flex justify-content-between'><span className='text-slate-500'>Discount</span><PriceText value={discount} className='font-bold text-green-600' /></div>
                    <hr />
                    <div className='d-flex justify-content-between align-items-center mb-4'><span className='font-black text-slate-950'>Total</span><PriceText value={total} className='text-2xl font-black text-blue-600' /></div>
                    <Button type='submit' className='w-100 py-3' isLoading={isSubmitting}>Confirm & Place Order</Button>
                  </Card.Body></Card>
                </Col>
              </Row>
            </Form>
          )}
        </Container>
      </section>
    </MainLayout>
  )
}

export default CheckoutPage
