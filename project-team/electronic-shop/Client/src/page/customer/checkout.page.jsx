import { useEffect, useMemo, useState } from 'react'
import Container from 'react-bootstrap/Container'
import Row from 'react-bootstrap/Row'
import Col from 'react-bootstrap/Col'
import Card from 'react-bootstrap/Card'
import Form from 'react-bootstrap/Form'
import Modal from 'react-bootstrap/Modal'
import { useLocation, useNavigate } from 'react-router-dom'

import MainLayout from '../../components/templates/MainLayout'
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
import {
  createBankTransferPayment,
  createZaloPayPayment,
} from '../../services/payment.service'
import { getShippingMethods } from '../../services/shipping.service'
import { getUserById } from '../../services/user.service'
import { getCurrentUser, getUserId } from '../../utils/authStorage'
import { getCartIdentity } from '../../utils/sessionCart'
import { formatCurrency, getId, pickArray } from '../../utils/format'

const CHECKOUT_SELECTED_ITEMS_KEY = 'electronic_shop_checkout_items'

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

function getCartItemId(item) {
  return item?._id || item?.id || ''
}

function getProductName(item) {
  const product = item?.product_id || item?.product || {}

  if (typeof product === 'string') {
    return item?.product_name || 'Sản phẩm'
  }

  return product?.name || item?.product_name || 'Sản phẩm'
}

function getCheckoutPayloadFromStorage() {
  try {
    const rawValue = sessionStorage.getItem(CHECKOUT_SELECTED_ITEMS_KEY)
    return rawValue ? JSON.parse(rawValue) : null
  } catch {
    return null
  }
}

function filterCheckoutItems(allItems, locationState) {
  const storagePayload = getCheckoutPayloadFromStorage()

  const selectedItemIds =
    locationState?.selectedItemIds ||
    storagePayload?.selectedItemIds ||
    []

  if (!Array.isArray(selectedItemIds) || selectedItemIds.length === 0) {
    return allItems
  }

  return allItems.filter((item) => selectedItemIds.includes(getCartItemId(item)))
}

function getAddressId(address) {
  return address?._id || address?.id || ''
}

function isDefaultAddress(address) {
  return Boolean(address?.is_default || address?.isDefault || address?.default)
}

function getAddressReceiverName(address) {
  return (
    address?.receive_name ||
    address?.receiver_name ||
    address?.receiverName ||
    ''
  )
}

function getAddressReceiverPhone(address) {
  return (
    address?.receive_phone ||
    address?.receiver_phone ||
    address?.receiverPhone ||
    ''
  )
}

function getAddressProvince(address) {
  return address?.province || address?.address_province || ''
}

function getAddressDistrict(address) {
  return address?.district || address?.address_district || ''
}

function getAddressWard(address) {
  return address?.ward || address?.address_ward || ''
}

function getAddressLine(address) {
  return (
    address?.address_line ||
    address?.addressAddressLine ||
    address?.address_address_line ||
    ''
  )
}

function formatAddress(address) {
  return [
    getAddressLine(address),
    getAddressWard(address),
    getAddressDistrict(address),
    getAddressProvince(address),
  ]
    .filter(Boolean)
    .join(', ')
}

function buildAddressForm(address, currentUser) {
  return {
    receiver_name: getAddressReceiverName(address) || currentUser?.name || '',
    receiver_phone: getAddressReceiverPhone(address) || currentUser?.phone || '',
    address_province: getAddressProvince(address),
    address_district: getAddressDistrict(address),
    address_ward: getAddressWard(address),
    address_address_line: getAddressLine(address),
  }
}

function CheckoutPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const user = getCurrentUser()

  const [form, setForm] = useState({
    ...initialForm,
    receiver_name: user?.name || '',
    receiver_phone: user?.phone || '',
  })

  const [items, setItems] = useState([])
  const [cart, setCart] = useState(null)
  const [shippingMethods, setShippingMethods] = useState([])
  const [addresses, setAddresses] = useState([])
  const [selectedAddressId, setSelectedAddressId] = useState('')
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false)
  const [discount, setDiscount] = useState(0)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [locations, setLocations] = useState([])
  const [districtOptions, setDistrictOptions] = useState([])
  const [wardOptions, setWardOptions] = useState([])
  const [locationsError, setLocationsError] = useState('')

  const selectedAddress = useMemo(() => {
    return addresses.find((address) => getAddressId(address) === selectedAddressId) || null
  }, [addresses, selectedAddressId])

  const isManualAddress = !selectedAddressId

  const subtotal = useMemo(() => {
    return items.reduce(
      (sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0),
      0,
    )
  }, [items])

  const selectedShipping =
    shippingMethods.find((item) => getId(item) === form.shipping_method_id) ||
    shippingMethods[0]

  const shippingFee = Number(selectedShipping?.base_fee || 0)
  const total = Math.max(subtotal + shippingFee - discount, 0)

  useEffect(() => {
    let mounted = true

    const load = async () => {
      try {
        setIsLoading(true)
        setError('')
        setMessage('')

        const requests = [
          getCart(getCartIdentity(user)),
          getShippingMethods({ is_active: true }),
        ]

        if (user && getUserId(user)) {
          requests.push(getUserById(getUserId(user)))
        }

        const [cartRes, shippingRes, userRes] = await Promise.all(requests)

        if (!mounted) return

        const cartData = cartRes?.data || {}
        const methods = pickArray(shippingRes, [])
        const allItems = cartData.items || []
        const checkoutItems = filterCheckoutItems(allItems, location.state)

        const userData = userRes?.data || {}
        const loadedAddresses = userData.addresses || userData.user_addresses || []

        const defaultAddress =
          loadedAddresses.find((address) => isDefaultAddress(address)) ||
          loadedAddresses[0] ||
          null

        setCart(cartData.cart || null)
        setItems(checkoutItems)
        setShippingMethods(methods)
        setAddresses(loadedAddresses)

        if (defaultAddress) {
          setSelectedAddressId(getAddressId(defaultAddress))

          setForm((prev) => ({
            ...prev,
            ...buildAddressForm(defaultAddress, user),
            shipping_method_id: getId(methods[0]) || '',
          }))
        } else {
          setSelectedAddressId('')

          setForm((prev) => ({
            ...prev,
            shipping_method_id: getId(methods[0]) || '',
          }))
        }
      } catch (error) {
        if (!mounted) return

        setCart(null)
        setItems([])
        setShippingMethods([])
        setAddresses([])
        setError(getErrorMessage(error, 'Không tải được dữ liệu thanh toán từ backend.'))
      } finally {
        if (mounted) setIsLoading(false)
      }
    }

    load()

    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    const loadLocations = async () => {
      try {
        const response = await fetch('https://provinces.open-api.vn/api/?depth=3')
        const data = await response.json()

        if (!Array.isArray(data)) {
          throw new Error('Invalid location data')
        }

        setLocations(data)
        setLocationsError('')
      } catch (error) {
        setLocations([])
        setDistrictOptions([])
        setWardOptions([])
        setLocationsError('Không tải được danh sách địa chỉ. Vui lòng thử lại sau.')
      }
    }

    loadLocations()
  }, [])

  useEffect(() => {
    const province = locations.find((item) => item.name === form.address_province)
    const districtList = province?.districts || []

    setDistrictOptions(
      districtList.map((district) => ({
        value: district.name,
        label: district.name,
      })),
    )

    setWardOptions([])
  }, [form.address_province, locations])

  useEffect(() => {
    const province = locations.find((item) => item.name === form.address_province)
    const district = province?.districts?.find((item) => item.name === form.address_district)
    const wardList = district?.wards || []

    setWardOptions(
      wardList.map((ward) => ({
        value: ward.name,
        label: ward.name,
      })),
    )
  }, [form.address_province, form.address_district, locations])

  const buildLocationOptions = (options, placeholder) => [
    { value: '', label: placeholder },
    ...options,
  ]

  const handleChange = (event) => {
    const { name, value } = event.target

    setForm((prev) => ({
      ...prev,
      [name]: value,
      ...(name === 'address_province'
        ? { address_district: '', address_ward: '' }
        : {}),
      ...(name === 'address_district' ? { address_ward: '' } : {}),
    }))

    if (name === 'coupon_code') {
      setDiscount(0)
    }

    setError('')
    setMessage('')
  }

  const handleOpenAddressModal = () => {
    setIsAddressModalOpen(true)
  }

  const handleCloseAddressModal = () => {
    setIsAddressModalOpen(false)
  }

  const handleSelectAddress = (address) => {
    const addressId = getAddressId(address)

    setSelectedAddressId(addressId)

    setForm((prev) => ({
      ...prev,
      ...buildAddressForm(address, user),
    }))

    setIsAddressModalOpen(false)
    setError('')
    setMessage('')
  }

  const handleUseManualAddress = () => {
    setSelectedAddressId('')

    setForm((prev) => ({
      ...prev,
      receiver_name: user?.name || prev.receiver_name,
      receiver_phone: user?.phone || prev.receiver_phone,
      address_province: '',
      address_district: '',
      address_ward: '',
      address_address_line: '',
    }))

    setIsAddressModalOpen(false)
    setError('')
    setMessage('')
  }

  const handleApplyCoupon = async () => {
    if (!form.coupon_code.trim()) {
      setError('Vui lòng nhập mã giảm giá.')
      return
    }

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
      setMessage('Áp dụng mã giảm giá thành công.')
    } catch (error) {
      setDiscount(0)
      setError(getErrorMessage(error, 'Mã giảm giá không hợp lệ.'))
    }
  }

  const validate = () => {
    if (!user) {
      return 'Backend hiện tại yêu cầu đăng nhập để tạo đơn hàng. Vui lòng đăng nhập trước khi thanh toán.'
    }

    const requiredFields = [
      'receiver_name',
      'receiver_phone',
      'address_province',
      'address_district',
      'address_ward',
      'address_address_line',
    ]

    for (const field of requiredFields) {
      if (!form[field].trim()) {
        return 'Vui lòng nhập đầy đủ thông tin giao hàng.'
      }
    }

    if (!items.length) {
      return 'Không có sản phẩm nào được chọn để thanh toán.'
    }

    if (!form.shipping_method_id) {
      return 'Vui lòng chọn phương thức giao hàng.'
    }

    return ''
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    const validationMessage = validate()

    if (validationMessage) {
      setError(validationMessage)
      return
    }

    try {
      setIsSubmitting(true)
      setError('')
      setMessage('')

      const storagePayload = getCheckoutPayloadFromStorage()

      const payload = {
        user_id: getUserId(user),
        user_address_id: selectedAddressId || undefined,
        address_id: selectedAddressId || undefined,
        shipping_method_id: form.shipping_method_id || undefined,
        receiver_name: form.receiver_name.trim(),
        receiver_phone: form.receiver_phone.trim(),
        address_province: form.address_province.trim(),
        address_district: form.address_district.trim(),
        address_ward: form.address_ward.trim(),
        address_address_line: form.address_address_line.trim(),
        note: form.note.trim(),
        payment_method: form.payment_method,
        coupon_code: form.coupon_code.trim() || undefined,
        cart_id: location.state?.cartId || storagePayload?.cartId || getId(cart),
        items: items.map((item) => ({
          product_id: getId(item.product_id),
          variant_id: getId(item.variant_id) || undefined,
          quantity: Number(item.quantity || 1),
        })),
      }

      const orderResponse = await createOrder(payload)
      const createdOrder =
        orderResponse?.data?.order ||
        orderResponse?.order ||
        orderResponse?.data ||
        null
      const orderId = getId(createdOrder)

      if (!orderId) {
        throw new Error('Không lấy được mã đơn hàng sau khi tạo đơn.')
      }

      sessionStorage.removeItem(CHECKOUT_SELECTED_ITEMS_KEY)

      if (form.payment_method === 'bank_transfer') {
        const paymentResponse = await createBankTransferPayment(orderId)
        const paymentData = paymentResponse?.data || {}

        navigate(`/payment-result/${orderId}`, {
          replace: true,
          state: {
            order: paymentData.order || createdOrder,
            payment: paymentData.payment || null,
          },
        })

        return
      }

      if (form.payment_method === 'zalopay') {
        const paymentResponse = await createZaloPayPayment(orderId)
        const paymentData = paymentResponse?.data || {}
        const paymentUrl = paymentData.payment_url || paymentData.order_url
        const resultOrder = paymentData.order || createdOrder
        const resultPayment = paymentData.payment || {
          provider: 'zalopay',
          status: paymentResponse?.success === false ? 'failed' : 'pending',
          amount: resultOrder.total_amount,
          payment_url: paymentUrl,
        }

        if (paymentUrl) {
          window.open(paymentUrl, '_blank', 'noopener,noreferrer')
        }

        navigate(`/payment-result/${orderId}`, {
          replace: true,
          state: {
            order: resultOrder,
            payment: resultPayment,
          },
        })

        return
      }

      navigate(`/payment-result/${orderId}`, {
        replace: true,
        state: {
          order: createdOrder,
          payment: {
            provider: 'cod',
            status: createdOrder.payment_status || 'unpaid',
            amount: createdOrder.total_amount,
          },
        },
      })
    } catch (error) {
      setError(getErrorMessage(error, 'Không tạo được đơn hàng.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <MainLayout>
      <section className='page-section'>
        <Container>
          <Alert type='danger'>{error}</Alert>
          <Alert type='success'>{message}</Alert>

          {isLoading ? (
            <LoadingText />
          ) : items.length === 0 ? (
            <EmptyState
              icon='🛒'
              title='Không có sản phẩm để thanh toán'
              description='Bạn chưa chọn sản phẩm nào từ giỏ hàng hoặc giỏ hàng đang trống.'
              actionLabel='Quay lại sản phẩm'
              onAction={() => navigate('/products')}
            />
          ) : (
            <Form onSubmit={handleSubmit}>
              <Row className='g-4 align-items-start'>
                <Col lg={8}>
                  <Card className='card-surface mb-4'>
                    <Card.Body className='p-4'>
                      <div className='mb-4 d-flex flex-wrap align-items-center justify-content-between gap-3'>
                        <div>
                          <p className='mb-1 text-xs font-black uppercase tracking-[0.25em] text-orange-600'>
                            Giao hàng
                          </p>

                          <h3 className='mb-0 text-2xl font-black text-slate-950'>
                            Người nhận
                          </h3>
                        </div>

                        <span className='rounded-pill bg-orange-50 px-3 py-2 text-sm font-black text-orange-700'>
                          {addresses.length} địa chỉ
                        </span>
                      </div>

                      <div className='mb-4 overflow-hidden rounded-4 border border-orange-100 bg-orange-50/40'>
                        <div
                          className='bg-orange-500'
                          style={{
                            height: 4,
                          }}
                        />

                        <div className='p-4'>
                          <div className='mb-4 d-flex flex-wrap align-items-center justify-content-between gap-3'>
                            <div className='d-flex align-items-center gap-3'>
                              <span className='text-xl text-orange-600'>
                                <i className='bi bi-geo-alt-fill' />
                              </span>

                              <p className='mb-0 text-lg font-black text-orange-700'>
                                Địa chỉ nhận hàng
                              </p>
                            </div>

                            {addresses.length > 0 && (
                              <button
                                type='button'
                                onClick={handleOpenAddressModal}
                                className='rounded-pill px-4 py-2 text-sm font-bold shadow-sm transition'
                                style={{
                                  border: '1px solid #fed7aa',
                                  backgroundColor: '#ffffff',
                                  color: '#ea580c',
                                }}
                                onMouseEnter={(event) => {
                                  event.currentTarget.style.borderColor = '#f97316'
                                  event.currentTarget.style.backgroundColor = '#f97316'
                                  event.currentTarget.style.color = '#ffffff'
                                }}
                                onMouseLeave={(event) => {
                                  event.currentTarget.style.borderColor = '#fed7aa'
                                  event.currentTarget.style.backgroundColor = '#ffffff'
                                  event.currentTarget.style.color = '#ea580c'
                                }}
                              >
                                Thay đổi
                              </button>
                            )}
                          </div>

                          {selectedAddress ? (
                            <Row className='g-3 align-items-stretch'>
                              <Col md={4}>
                                <div className='h-100 rounded-4 bg-white px-4 py-3 shadow-sm'>
                                  <p className='mb-1 text-xs font-black uppercase text-slate-400'>
                                    Người nhận
                                  </p>

                                  <p className='mb-1 text-base font-black text-slate-950'>
                                    {getAddressReceiverName(selectedAddress)}
                                  </p>

                                  <p className='mb-0 text-sm font-bold text-slate-500'>
                                    {getAddressReceiverPhone(selectedAddress)}
                                  </p>
                                </div>
                              </Col>

                              <Col md={8}>
                                <div className='h-100 rounded-4 bg-white px-4 py-3 shadow-sm'>
                                  <div className='mb-2 d-flex flex-wrap align-items-center justify-content-between gap-2'>
                                    <p className='mb-0 text-xs font-black uppercase text-slate-400'>
                                      Địa chỉ giao hàng
                                    </p>

                                    {isDefaultAddress(selectedAddress) && (
                                      <span className='rounded-1 border border-orange-500 px-2 py-1 text-xs font-bold text-orange-600'>
                                        Mặc định
                                      </span>
                                    )}
                                  </div>

                                  <p className='mb-0 text-sm leading-7 text-slate-700'>
                                    {formatAddress(selectedAddress)}
                                  </p>
                                </div>
                              </Col>
                            </Row>
                          ) : (
                            <div className='rounded-4 bg-white px-4 py-3 shadow-sm'>
                              <p className='mb-1 font-bold text-slate-800'>
                                Nhập địa chỉ giao hàng mới
                              </p>

                              <p className='mb-0 text-sm text-slate-500'>
                                Điền thông tin người nhận và địa chỉ bên dưới.
                              </p>
                            </div>
                          )}
                        </div>
                      </div>

                      {isManualAddress && (
                        <Row className='g-3'>
                          <Col md={6}>
                            <TextField
                              label='Họ và tên'
                              name='receiver_name'
                              value={form.receiver_name}
                              onChange={handleChange}
                            />
                          </Col>

                          <Col md={6}>
                            <TextField
                              label='Số điện thoại'
                              name='receiver_phone'
                              value={form.receiver_phone}
                              onChange={handleChange}
                            />
                          </Col>

                          <Col md={4}>
                            <SelectField
                              label='Tỉnh / Thành phố'
                              name='address_province'
                              value={form.address_province}
                              onChange={handleChange}
                              options={buildLocationOptions(
                                locations.map((province) => ({
                                  value: province.name,
                                  label: province.name,
                                })),
                                locations.length ? 'Chọn tỉnh / thành phố' : 'Đang tải tỉnh / thành phố...',
                              )}
                            />
                          </Col>

                          <Col md={4}>
                            <SelectField
                              label='Quận / Huyện'
                              name='address_district'
                              value={form.address_district}
                              onChange={handleChange}
                              options={buildLocationOptions(
                                districtOptions,
                                form.address_province
                                  ? districtOptions.length
                                    ? 'Chọn quận / huyện'
                                    : 'Không có quận / huyện'
                                  : 'Chọn tỉnh / thành phố trước',
                              )}
                              disabled={!form.address_province || districtOptions.length === 0}
                            />
                          </Col>

                          <Col md={4}>
                            <SelectField
                              label='Phường / Xã'
                              name='address_ward'
                              value={form.address_ward}
                              onChange={handleChange}
                              options={buildLocationOptions(
                                wardOptions,
                                form.address_district
                                  ? wardOptions.length
                                    ? 'Chọn phường / xã'
                                    : 'Không có phường / xã'
                                  : 'Chọn quận / huyện trước',
                              )}
                              disabled={!form.address_district || wardOptions.length === 0}
                            />
                          </Col>

                          <Col xs={12}>
                            <TextField
                              label='Địa chỉ cụ thể'
                              name='address_address_line'
                              value={form.address_address_line}
                              onChange={handleChange}
                            />
                          </Col>
                        </Row>
                      )}

                      <div className='mt-4'>
                        <TextAreaField
                          label='Ghi chú đơn hàng'
                          name='note'
                          rows={2}
                          value={form.note}
                          onChange={handleChange}
                        />
                      </div>
                    </Card.Body>
                  </Card>

                  <Card className='card-surface'>
                    <Card.Body className='p-4'>
                      <h3 className='mb-4 text-2xl font-black text-slate-950'>
                        Thanh toán & giao hàng
                      </h3>

                      <Row className='g-3'>
                        <Col md={6}>
                          <SelectField
                            label='Phương thức giao hàng'
                            name='shipping_method_id'
                            value={form.shipping_method_id}
                            onChange={handleChange}
                            options={
                              shippingMethods.length
                                ? shippingMethods.map((item) => ({
                                  value: getId(item),
                                  label: `${item.name} - ${formatCurrency(item.base_fee)}`,
                                }))
                                : [
                                  {
                                    value: '',
                                    label: 'Chưa có phương thức giao hàng',
                                  },
                                ]
                            }
                          />
                        </Col>

                        <Col md={6}>
                          <SelectField
                            label='Phương thức thanh toán'
                            name='payment_method'
                            value={form.payment_method}
                            onChange={handleChange}
                            options={[
                              {
                                value: 'cod',
                                label: 'Thanh toán khi nhận hàng',
                              },
                              {
                                value: 'bank_transfer',
                                label: 'Chuyển khoản ngân hàng / VietQR',
                              },
                              {
                                value: 'zalopay',
                                label: 'ZaloPay Sandbox',
                              },
                            ]}
                          />
                        </Col>
                      </Row>
                    </Card.Body>
                  </Card>
                </Col>

                <Col lg={4}>
                  <Card
                    className='card-surface position-sticky'
                    style={{
                      top: 132,
                      zIndex: 10,
                    }}
                  >
                    <Card.Body className='p-4'>
                      <h3 className='mb-4 text-2xl font-black text-slate-950'>
                        Sản Phẩm
                      </h3>

                      <div className='d-flex flex-column gap-2'>
                        {items.map((item) => (
                          <div
                            key={item._id || item.id}
                            className='d-flex justify-content-between gap-3 border-bottom py-2'
                          >
                            <span className='text-sm text-slate-600'>
                              {getProductName(item)} x {item.quantity}
                            </span>

                            <PriceText
                              value={Number(item.price || 0) * Number(item.quantity || 0)}
                              className='text-sm font-bold'
                            />
                          </div>
                        ))}
                      </div>

                      <div className='mt-3 d-flex align-items-center gap-2'>
                        <TextField
                          name='coupon_code'
                          placeholder='Mã giảm giá'
                          value={form.coupon_code}
                          onChange={handleChange}
                          className='mb-0 flex-grow-1 [&_.form-control]:!h-[38px] [&_.form-control]:!min-h-[38px] [&_.form-control]:!rounded-full [&_.form-control]:!px-3 [&_.form-control]:!py-1.5 [&_.form-control]:!text-[13px] [&_.form-control]:!leading-tight'
                        />

                        <Button
                          type='button'
                          variant='secondary'
                          onClick={handleApplyCoupon}
                          className='!h-[38px] !min-h-[38px] !rounded-full !px-3 !py-1.5 !text-[13px] !leading-tight'
                        >
                          Áp dụng
                        </Button>
                      </div>

                      <div className='mt-4 d-flex justify-content-between'>
                        <span className='text-slate-500'>Tạm tính</span>

                        <PriceText
                          value={subtotal}
                          className='font-bold'
                        />
                      </div>

                      <div className='mt-2 d-flex justify-content-between'>
                        <span className='text-slate-500'>Phí giao hàng</span>

                        <PriceText
                          value={shippingFee}
                          className='font-bold'
                        />
                      </div>

                      <div className='mt-2 d-flex justify-content-between'>
                        <span className='text-slate-500'>Giảm giá</span>

                        <PriceText
                          value={discount}
                          className='font-bold text-green-600'
                        />
                      </div>

                      <hr />

                      <div className='mb-4 d-flex align-items-center justify-content-between'>
                        <span className='font-black text-slate-950'>
                          Tổng cộng
                        </span>

                        <PriceText
                          value={total}
                          className='text-2xl font-black text-orange-600'
                        />
                      </div>

                      <Button
                        type='submit'
                        className='w-100 py-3'
                        isLoading={isSubmitting}
                      >
                        Đặt hàng
                      </Button>
                    </Card.Body>
                  </Card>
                </Col>
              </Row>
            </Form>
          )}
        </Container>
      </section>

      <Modal
        show={isAddressModalOpen}
        onHide={handleCloseAddressModal}
        centered
        size='lg'
      >
        <Modal.Header className='border-bottom px-4 py-3'>
          <Modal.Title className='text-xl font-bold text-slate-900'>
            Địa Chỉ Của Tôi
          </Modal.Title>

          <button
            type='button'
            onClick={handleCloseAddressModal}
            className='ms-auto d-flex align-items-center justify-content-center border-0 bg-transparent text-3xl text-slate-500 hover:text-slate-900'
            aria-label='Đóng'
          >
            ×
          </button>
        </Modal.Header>

        <Modal.Body className='p-0'>
          {addresses.length === 0 ? (
            <div className='p-4 text-center text-slate-500'>
              Chưa có địa chỉ đã lưu.
            </div>
          ) : (
            <div>
              {addresses.map((address, index) => {
                const addressId = getAddressId(address)
                const addressKey = addressId || `address-${index}`
                const isSelected = selectedAddressId === addressId

                return (
                  <button
                    key={addressKey}
                    type='button'
                    onClick={() => handleSelectAddress(address)}
                    className='w-100 border-0 border-bottom bg-white px-4 py-4 text-start transition hover:bg-slate-50'
                  >
                    <div className='d-flex align-items-start gap-3'>
                      <span
                        className={`mt-1 d-flex align-items-center justify-content-center rounded-circle border ${isSelected
                            ? 'border-orange-500'
                            : 'border-slate-300'
                          }`}
                        style={{
                          width: 22,
                          height: 22,
                          minWidth: 22,
                        }}
                      >
                        {isSelected && (
                          <span
                            className='rounded-circle bg-orange-500'
                            style={{
                              width: 10,
                              height: 10,
                            }}
                          />
                        )}
                      </span>

                      <div className='flex-grow-1'>
                        <div className='mb-2 d-flex flex-wrap align-items-center gap-3'>
                          <span className='text-base font-black text-slate-950'>
                            {getAddressReceiverName(address) || 'Người nhận'}
                          </span>

                          <span className='d-none d-sm-inline text-slate-300'>
                            |
                          </span>

                          <span className='text-base text-slate-500'>
                            {getAddressReceiverPhone(address)}
                          </span>

                          <button
                            type='button'
                            onClick={(event) => {
                              event.stopPropagation()
                              navigate('/profile')
                            }}
                            className='ms-auto border-0 bg-transparent px-0 font-bold text-blue-600 hover:text-orange-600'
                          >
                            Cập nhật
                          </button>
                        </div>

                        <p className='mb-2 text-base leading-7 text-slate-500'>
                          {formatAddress(address)}
                        </p>

                        <div className='d-flex flex-wrap gap-2'>
                          {isDefaultAddress(address) && (
                            <span className='border border-orange-500 px-2 py-1 text-xs font-bold text-orange-600'>
                              Mặc định
                            </span>
                          )}

                          <span className='border border-slate-300 px-2 py-1 text-xs text-slate-500'>
                            Địa chỉ lấy hàng
                          </span>

                          <span className='border border-slate-300 px-2 py-1 text-xs text-slate-500'>
                            Địa chỉ trả hàng
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </Modal.Body>

        <Modal.Footer className='border-top bg-white px-4 py-3'>
          <button
            type='button'
            onClick={handleUseManualAddress}
            className='ms-auto d-flex align-items-center gap-2 rounded-2 border-0 bg-orange-500 px-4 py-3 font-bold text-white shadow-sm transition hover:bg-orange-600'
          >
            <i className='bi bi-plus-lg' />
            Thêm Địa Chỉ Mới
          </button>
        </Modal.Footer>
      </Modal>
    </MainLayout>
  )
}

export default CheckoutPage