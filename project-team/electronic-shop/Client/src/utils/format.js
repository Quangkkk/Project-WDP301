export const formatCurrency = (value) => {
  const number = Number(value || 0)

  if (!number) return '0 ₫'

  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(number)
}

export const formatDate = (value) => {
  if (!value) return '--'

  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(value))
}

export const formatOrderCode = (orderOrId) => {
  const storedCode =
    typeof orderOrId === 'object' && orderOrId
      ? orderOrId.order_code || orderOrId.orderCode
      : ''

  if (storedCode) {
    const normalizedCode = String(storedCode)
      .trim()
      .replace(/^#/, '')
      .toUpperCase()

    return normalizedCode ? `#${normalizedCode}` : '-'
  }

  const id = getId(orderOrId)

  return id
    ? `#TS-${String(id).slice(-8).toUpperCase()}`
    : '-'
}

export const getId = (value) => {
  if (!value) return ''
  if (typeof value === 'string') return value
  if (value.$oid) return value.$oid
  return value._id || value.id || ''
}

export const getDateValue = (value) => {
  if (!value) return ''
  if (value.$date) return value.$date
  return value
}

export const getEntityName = (entity, fallback = '') => {
  if (!entity) return fallback
  if (typeof entity === 'string') return fallback
  return entity.name || entity.code || fallback
}

export const normalizeText = (value) => String(value || '').toLowerCase().trim()

export const pickArray = (response, fallback = []) => {
  if (Array.isArray(response)) return response
  if (Array.isArray(response?.data)) return response.data
  if (Array.isArray(response?.data?.data)) return response.data.data
  return fallback
}

export const pickData = (response, fallback = null) => {
  if (response?.data !== undefined) return response.data
  return response || fallback
}

export const toInputDate = (value) => {
  if (!value) return ''
  return new Date(getDateValue(value)).toISOString().slice(0, 10)
}