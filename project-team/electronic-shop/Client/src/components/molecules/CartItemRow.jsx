import Card from 'react-bootstrap/Card'
import { Link } from 'react-router-dom'

import PriceText from '../atoms/PriceText'
import { getId } from '../../utils/format'

function getCartItemId(item) {
  return item?._id || item?.id || ''
}

function getProduct(item) {
  return item?.product_id || item?.product || {}
}

function getVariant(item) {
  return item?.variant_id || item?.variant || {}
}

function getProductId(item) {
  const product = getProduct(item)

  if (typeof product === 'string') return product

  return getId(product)
}

function getProductName(item) {
  const product = getProduct(item)

  if (typeof product === 'string') {
    return item?.product_name || 'Sản phẩm'
  }

  return product?.name || item?.product_name || 'Sản phẩm'
}

function getVariantLabel(item) {
  const variant = getVariant(item)

  if (!variant || typeof variant === 'string') {
    return item?.variant_name || item?.variant_value || ''
  }

  const values = [
    variant.variant_value,
    variant.variant_name,
    variant.color,
    variant.storage,
    variant.ram,
  ].filter(Boolean)

  return values.join(' - ')
}

function getProductImage(item) {
  const product = getProduct(item)
  const variant = getVariant(item)

  return (
    variant?.image ||
    variant?.image_url ||
    product?.thumbnail ||
    product?.image ||
    product?.image_url ||
    product?.images?.[0] ||
    item?.image ||
    ''
  )
}

function getItemStock(item) {
  const variant = getVariant(item)

  return Number(
    variant?.stock_quantity ??
      variant?.stock ??
      item?.stock_quantity ??
      item?.stock ??
      99,
  )
}

function QuantityControl({ value, max, disabled, onChange }) {
  const safeMax = Number(max || 99)

  const updateValue = (nextValue) => {
    const numberValue = Number(nextValue)

    if (!Number.isFinite(numberValue) || numberValue < 1) {
      onChange(1)
      return
    }

    if (safeMax && numberValue > safeMax) {
      onChange(safeMax)
      return
    }

    onChange(numberValue)
  }

  const handleInputChange = (event) => {
    const rawValue = event.target.value.replace(/\D/g, '')

    if (!rawValue) {
      onChange(1)
      return
    }

    updateValue(rawValue)
  }

  return (
    <div className='d-inline-flex align-items-center overflow-hidden rounded-pill border border-slate-200 bg-white shadow-sm'>
      <button
        type='button'
        onClick={() => updateValue(Number(value) - 1)}
        disabled={disabled || Number(value) <= 1}
        className='d-flex align-items-center justify-content-center border-0 bg-slate-100 text-sm font-black text-slate-700 transition hover:bg-orange-500 hover:text-white disabled:opacity-40 disabled:hover:bg-slate-100 disabled:hover:text-slate-700'
        style={{
          width: 50,
          height: 42,
        }}
        aria-label='Giảm số lượng'
      >
        −
      </button>

      <input
        type='text'
        inputMode='numeric'
        pattern='[0-9]*'
        value={value}
        disabled={disabled}
        onChange={handleInputChange}
        className='border-0 bg-white p-0 text-center text-sm font-bold text-slate-900 shadow-none outline-none'
        style={{
          width: 58,
          height: 42,
          lineHeight: '42px',
        }}
      />

      <button
        type='button'
        onClick={() => updateValue(Number(value) + 1)}
        disabled={disabled || Number(value) >= safeMax}
        className='d-flex align-items-center justify-content-center border-0 bg-slate-100 text-sm font-black text-slate-700 transition hover:bg-orange-500 hover:text-white disabled:opacity-40 disabled:hover:bg-slate-100 disabled:hover:text-slate-700'
        style={{
          width: 50,
          height: 42,
        }}
        aria-label='Tăng số lượng'
      >
        +
      </button>
    </div>
  )
}

function CartItemRow({
  item,
  selected = false,
  onToggleSelect,
  onQuantityChange,
  onRemove,
}) {
  const itemId = getCartItemId(item)
  const productId = getProductId(item)
  const productName = getProductName(item)
  const variantLabel = getVariantLabel(item)
  const image = getProductImage(item)
  const stock = getItemStock(item)
  const quantity = Number(item?.quantity || 1)
  const itemTotal = Number(item?.price || 0) * quantity

  return (
    <Card
      className={`position-relative overflow-hidden !rounded-4 border bg-white shadow-sm transition ${
        selected ? 'border-orange-300' : 'border-slate-200'
      }`}
    >
      <Card.Body className='p-4'>
        <div className='d-flex flex-wrap align-items-center gap-4'>
          <label className='d-flex align-items-center'>
            <input
              type='checkbox'
              checked={selected}
              onChange={onToggleSelect}
              className='form-check-input m-0'
              style={{
                width: 22,
                height: 22,
              }}
              aria-label='Chọn sản phẩm để thanh toán'
            />
          </label>

          <Link
            to={productId ? `/products/${productId}` : '#'}
            className='d-flex align-items-center justify-content-center overflow-hidden !rounded-4 bg-slate-100 text-decoration-none'
            style={{
              width: 112,
              height: 112,
              minWidth: 112,
            }}
          >
            {image ? (
              <img
                src={image}
                alt={productName}
                className='h-100 w-100 object-cover'
                onError={(event) => {
                  event.currentTarget.style.display = 'none'
                }}
              />
            ) : (
              <span className='text-4xl'>
                💻
              </span>
            )}
          </Link>

          <div className='flex-grow-1'>
            <Link
              to={productId ? `/products/${productId}` : '#'}
              className='text-decoration-none'
            >
              <h3 className='mb-2 text-2xl font-black text-slate-950'>
                {productName}
              </h3>
            </Link>

            {variantLabel && (
              <p className='mb-2 text-sm font-medium text-slate-500'>
                {variantLabel}
              </p>
            )}

            <PriceText
              value={item?.price}
              className='text-base font-black text-orange-600'
            />
          </div>

          <div className='text-center'>
            <p className='mb-2 text-xs font-black uppercase text-slate-400'>
              Số lượng
            </p>

            <QuantityControl
              value={quantity}
              max={stock}
              onChange={(nextQuantity) => onQuantityChange(itemId, nextQuantity)}
            />
          </div>

          <div className='text-end' style={{ minWidth: 150 }}>
            <p className='mb-2 text-xs font-black uppercase text-slate-400'>
              Tạm tính
            </p>

            <PriceText
              value={itemTotal}
              className='text-xl font-black text-slate-950'
            />
          </div>

          <div className='d-flex align-items-center justify-content-center'>
            <button
              type='button'
              onClick={() => onRemove(itemId)}
              className='d-flex align-items-center justify-content-center !rounded-circle border-0 bg-slate-100 text-slate-500 shadow-sm transition hover:bg-red-500 hover:text-white'
              style={{
                width: 38,
                height: 38,
                minWidth: 38,
              }}
              aria-label='Xóa sản phẩm'
              title='Xóa sản phẩm'
            >
              <i className='bi bi-x-lg' />
            </button>
          </div>
        </div>
      </Card.Body>
    </Card>
  )
}

export default CartItemRow