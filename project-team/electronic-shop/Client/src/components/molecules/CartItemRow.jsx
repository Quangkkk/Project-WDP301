import Card from 'react-bootstrap/Card'
import PriceText from '../atoms/PriceText'
import QuantityControl from './QuantityControl'
import { getId } from '../../utils/format'

function CartItemRow({ item, onQuantityChange, onRemove }) {
  const product = item.product_id || item.product || {}
  const variant = item.variant_id || item.variant || {}
  const image = variant.image || item.image || ''
  const subtotal = Number(item.price || 0) * Number(item.quantity || 0)

  return (
    <Card className='card-surface mb-3'>
      <Card.Body className='p-3'>
        <div className='d-flex flex-column flex-md-row align-items-md-center gap-3'>
          <div className='flex h-24 w-24 shrink-0 items-center justify-center rounded-4 bg-slate-100 text-4xl'>
            {image ? <img src={image} alt={product.name} className='h-full w-full object-contain' onError={(e) => { e.currentTarget.style.display = 'none' }} /> : '💻'}
          </div>
          <div className='flex-grow-1'>
            <h3 className='mb-1 text-lg font-black text-slate-950'>{product.name || 'Product'}</h3>
            <p className='mb-2 text-sm text-slate-500'>{variant.variant_value || variant.sku || product.sku}</p>
            <PriceText value={item.price} className='font-bold text-blue-600' />
          </div>
          <QuantityControl value={Number(item.quantity || 1)} onChange={(quantity) => onQuantityChange?.(getId(item), quantity)} />
          <div className='text-md-end'>
            <p className='mb-2 text-xs font-bold uppercase text-slate-400'>Subtotal</p>
            <PriceText value={subtotal} className='text-lg font-black text-slate-950' />
            <button type='button' className='mt-2 block border-0 bg-transparent p-0 text-sm font-bold text-red-500' onClick={() => onRemove?.(getId(item))}>Remove</button>
          </div>
        </div>
      </Card.Body>
    </Card>
  )
}

export default CartItemRow
