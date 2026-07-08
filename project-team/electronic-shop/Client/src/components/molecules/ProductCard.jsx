import Badge from 'react-bootstrap/Badge'
import Card from 'react-bootstrap/Card'
import { Link } from 'react-router-dom'
import PriceText from '../atoms/PriceText'
import StatusBadge from '../atoms/StatusBadge'
import { getId, getEntityName } from '../../utils/format'
import { getMainVariant, getProductImage, getProductOriginalPrice, getProductPrice, getStock } from '../../utils/product'

function ProductCard({ product }) {
  const variant = getMainVariant(product)
  const image = getProductImage(product, variant)
  const price = getProductPrice(product, variant)
  const original = getProductOriginalPrice(product, variant)
  const id = getId(product)

  return (
    <Card className='h-100 overflow-hidden card-surface transition duration-300 hover:-translate-y-1 hover:shadow-xl'>
      <Link to={`/products/${id}`} className='relative flex h-56 items-center justify-center bg-gradient-to-br from-slate-100 to-blue-50 p-4'>
        {image ? (
          <Card.Img src={image} alt={product?.name} className='h-full w-full product-image' onError={(e) => { e.currentTarget.style.display = 'none' }} />
        ) : (
          <div className='flex h-32 w-32 items-center justify-center rounded-5 bg-white text-5xl shadow-sm'>💻</div>
        )}
        {product?.is_featured && <Badge bg='primary' className='position-absolute start-0 top-0 m-3 rounded-pill px-3 py-2'>Featured</Badge>}
      </Link>
      <Card.Body className='d-flex flex-column p-4'>
        <div className='mb-3 d-flex flex-wrap gap-2'>
          <span className='rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700'>{getEntityName(product?.brand_id, 'Brand')}</span>
          <span className='rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600'>{getEntityName(product?.category_id, 'Electronic')}</span>
        </div>
        <Link to={`/products/${id}`} className='text-decoration-none'>
          <h3 className='mb-2 text-xl font-black text-slate-950 line-clamp-2'>{product?.name}</h3>
        </Link>
        <p className='mb-3 text-sm text-slate-500 line-clamp-2'>{product?.description || variant?.variant_value || 'Sản phẩm công nghệ chính hãng.'}</p>
        <div className='mt-auto'>
          <div className='mb-3 d-flex align-items-end justify-content-between gap-2'>
            <div>
              <PriceText value={price} className='text-xl font-black text-blue-600' />
              {original > price && <div className='text-xs text-slate-400 line-through'><PriceText value={original} /></div>}
            </div>
            <span className='text-sm font-bold text-slate-500'>⭐ {Number(product?.average_rating || 0).toFixed(1)}</span>
          </div>
          <div className='d-flex align-items-center justify-content-between gap-2'>
            <StatusBadge value={getStock(product, variant) > 0 ? 'active' : 'out_of_stock'} />
            <Link to={`/products/${id}`} className='rounded-pill bg-slate-950 px-4 py-2 text-sm font-bold text-white no-underline hover:bg-blue-600'>View detail</Link>
          </div>
        </div>
      </Card.Body>
    </Card>
  )
}

export default ProductCard
