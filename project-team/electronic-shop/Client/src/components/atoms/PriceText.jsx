import { formatCurrency } from '../../utils/format'

function PriceText({ value, className = '' }) {
  return <span className={className}>{formatCurrency(value)}</span>
}

export default PriceText
