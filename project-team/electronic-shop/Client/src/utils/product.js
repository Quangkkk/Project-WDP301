import { getEntityName } from './format'

export const getMainVariant = (product) => {
  if (Array.isArray(product?.variants) && product.variants.length > 0) {
    return product.variants[0]
  }
  return null
}

export const getProductPrice = (product, variant = getMainVariant(product)) => {
  return Number(variant?.sale_price || variant?.price || product?.sale_price || product?.price || 0)
}

export const getProductOriginalPrice = (product, variant = getMainVariant(product)) => {
  return Number(variant?.price || product?.price || 0)
}

export const getProductImage = (product, variant = getMainVariant(product)) => {
  if (variant?.image) return variant.image
  if (variant?.img_url) return variant.img_url
  if (product?.img_url) return product.img_url
  if (product?.image_url) return product.image_url
  if (Array.isArray(product?.images) && product.images.length > 0) return product.images[0]
  return ''
}

export const getProductSubtitle = (product) => {
  const brandName = getEntityName(product?.brand_id, 'Brand')
  const categoryName = getEntityName(product?.category_id, 'Electronic')
  return `${brandName} • ${categoryName}`
}

export const getStock = (product, variant = getMainVariant(product)) => {
  return Number(variant?.stock_quantity ?? product?.stock_quantity ?? 0)
}
