import Card from 'react-bootstrap/Card'
import Row from 'react-bootstrap/Row'
import Col from 'react-bootstrap/Col'
import Button from '../atoms/Button'
import SelectField from '../atoms/SelectField'
import TextField from '../atoms/TextField'
import { getId } from '../../utils/format'

function ProductFilterBar({ filters, categories, brands, onFilterChange, onResetFilters }) {
  const categoryOptions = [{ value: '', label: 'All categories' }, ...categories.map((item) => ({ value: getId(item), label: item.name }))]
  const brandOptions = [{ value: '', label: 'All brands' }, ...brands.map((item) => ({ value: getId(item), label: item.name }))]
  const sortOptions = [
    { value: 'latest', label: 'Latest' },
    { value: 'name-asc', label: 'Name A-Z' },
    { value: 'price-asc', label: 'Price low to high' },
    { value: 'price-desc', label: 'Price high to low' },
    { value: 'rating-desc', label: 'Best rating' },
  ]

  return (
    <Card className='card-surface mb-4'>
      <Card.Body className='p-4'>
        <Row className='g-3 align-items-end'>
          <Col lg={4}><TextField label='Search product' id='keyword' placeholder='Laptop, phone, accessory...' value={filters.keyword} onChange={(e) => onFilterChange('keyword', e.target.value)} /></Col>
          <Col md={6} lg={2}><SelectField label='Category' id='categoryId' value={filters.categoryId} options={categoryOptions} onChange={(e) => onFilterChange('categoryId', e.target.value)} /></Col>
          <Col md={6} lg={2}><SelectField label='Brand' id='brandId' value={filters.brandId} options={brandOptions} onChange={(e) => onFilterChange('brandId', e.target.value)} /></Col>
          <Col md={6} lg={2}><SelectField label='Sort' id='sortBy' value={filters.sortBy} options={sortOptions} onChange={(e) => onFilterChange('sortBy', e.target.value)} /></Col>
          <Col md={6} lg={2}><Button variant='secondary' className='w-100 py-3' onClick={onResetFilters}>Reset</Button></Col>
        </Row>
      </Card.Body>
    </Card>
  )
}

export default ProductFilterBar
