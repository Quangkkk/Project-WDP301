import { useEffect, useState } from 'react'
import Container from 'react-bootstrap/Container'
import Navbar from 'react-bootstrap/Navbar'
import Form from 'react-bootstrap/Form'
import Dropdown from 'react-bootstrap/Dropdown'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'

import BrandLogo from '../atoms/BrandLogo'
import HeaderActions from '../molecules/HeaderActions'
import { clearAuth, getCurrentUser, getUserRole, isAuthenticated } from '../../utils/authStorage'
import { getCategories } from '../../services/product.service'
import { pickArray } from '../../utils/format'

function HeaderSearch({ className = '' }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const [keyword, setKeyword] = useState('')

  useEffect(() => {
    if (location.pathname === '/products') {
      setKeyword(searchParams.get('keyword') || '')
    }
  }, [location.pathname, searchParams])

  const handleSubmit = (event) => {
    event.preventDefault()

    const value = keyword.trim()
    const params = new URLSearchParams()

    if (value) {
      params.set('keyword', value)
    }

    navigate(`/products${params.toString() ? `?${params.toString()}` : ''}`)
  }

  const handleClear = () => {
    setKeyword('')

    if (location.pathname === '/products') {
      navigate('/products')
    }
  }

  return (
    <Form onSubmit={handleSubmit} className={className}>
      <div className='d-flex align-items-center gap-2 rounded-pill border border-slate-200 bg-slate-50 px-3 py-2 transition focus-within:border-orange-500 focus-within:bg-white focus-within:shadow-sm'>
        <span className='text-slate-400'>
          <i className='bi bi-search' />
        </span>

        <Form.Control
          type='text'
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          placeholder='Search products...'
          className='border-0 bg-transparent p-0 text-sm shadow-none'
        />

        {keyword && (
          <button
            type='button'
            className='border-0 bg-transparent p-0 text-slate-400 hover:text-slate-700'
            onClick={handleClear}
            aria-label='Clear search'
          >
            <i className='bi bi-x-lg' />
          </button>
        )}
      </div>
    </Form>
  )
}

function CategoryDropdown() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const selectedCategoryId = searchParams.get('categoryId') || ''
  const [categories, setCategories] = useState([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    let mounted = true

    const loadCategories = async () => {
      try {
        setIsLoading(true)

        const response = await getCategories({ status: 'active' })

        if (!mounted) return

        setCategories(pickArray(response, []))
      } catch (error) {
        if (!mounted) return

        setCategories([])
      } finally {
        if (mounted) setIsLoading(false)
      }
    }

    loadCategories()

    return () => {
      mounted = false
    }
  }, [])

  const selectedCategory = categories.find((category) => {
    const id = category._id || category.id
    return String(id) === String(selectedCategoryId)
  })

  const handleSelectCategory = (categoryId = '') => {
    if (!categoryId) {
      navigate('/products')
      return
    }

    const params = new URLSearchParams()
    params.set('categoryId', categoryId)

    navigate(`/products?${params.toString()}`)
  }

  return (
    <Dropdown align='end'>
      <Dropdown.Toggle
        variant='light'
        className='d-flex align-items-center gap-2 rounded-pill border-0 bg-orange-50 px-3 py-2 font-bold text-orange-600 shadow-sm'
      >
        <i className='bi bi-grid-3x3-gap-fill' />
        <span className='d-none d-xl-inline'>
          {selectedCategory?.name || 'Danh mục'}
        </span>
      </Dropdown.Toggle>

      <Dropdown.Menu className='mt-2 min-w-56 rounded-4 border-0 p-2 shadow-lg'>
        <Dropdown.Item
          onClick={() => handleSelectCategory('')}
          className={`rounded-3 px-3 py-2 font-bold ${
            !selectedCategoryId ? 'bg-orange-50 text-orange-600' : ''
          }`}
        >
          Tất cả sản phẩm
        </Dropdown.Item>

        <Dropdown.Divider />

        {isLoading && (
          <Dropdown.Item disabled className='rounded-3 px-3 py-2 text-slate-500'>
            Đang tải danh mục...
          </Dropdown.Item>
        )}

        {!isLoading && categories.length === 0 && (
          <Dropdown.Item disabled className='rounded-3 px-3 py-2 text-slate-500'>
            Chưa có danh mục
          </Dropdown.Item>
        )}

        {!isLoading &&
          categories.map((category) => {
            const categoryId = category._id || category.id
            const isActive = String(categoryId) === String(selectedCategoryId)

            return (
              <Dropdown.Item
                key={categoryId}
                onClick={() => handleSelectCategory(categoryId)}
                className={`rounded-3 px-3 py-2 ${
                  isActive ? 'bg-orange-50 font-bold text-orange-600' : 'text-slate-700'
                }`}
              >
                {category.name}
              </Dropdown.Item>
            )
          })}
      </Dropdown.Menu>
    </Dropdown>
  )
}

function CartButton() {
  const navigate = useNavigate()
  const location = useLocation()
  const isActive = location.pathname === '/cart'

  return (
    <button
      type='button'
      onClick={() => navigate('/cart')}
      className={`position-relative d-flex align-items-center justify-content-center rounded-circle border-0 shadow-sm transition ${
        isActive ? 'bg-orange-600 text-white' : 'bg-orange-50 text-orange-600'
      }`}
      style={{
        width: 46,
        height: 46,
      }}
      title='Cart'
      aria-label='Go to cart'
    >
      <i className='bi bi-cart3 fs-5' />

      {!isActive && (
        <span
          className='position-absolute rounded-circle bg-orange-600'
          style={{
            width: 9,
            height: 9,
            top: 9,
            right: 9,
            border: '2px solid #fff',
          }}
        />
      )}
    </button>
  )
}

function Header() {
  const navigate = useNavigate()
  const user = getCurrentUser()
  const loggedIn = isAuthenticated()
  const role = getUserRole(user)

  const handleLogout = () => {
    clearAuth()
    navigate('/login', { replace: true })
  }

  return (
    <Navbar className='sticky-top border-bottom bg-white/95 py-3 shadow-sm backdrop-blur'>
      <Container>
        <div className='d-flex w-100 align-items-center gap-3'>
          <div className='d-flex flex-shrink-0 align-items-center'>
            <BrandLogo />
          </div>

          <div className='d-flex flex-grow-1 justify-content-center px-4'>
            <div className='w-100' style={{ maxWidth: 520 }}>
              <HeaderSearch className='w-100' />
            </div>
          </div>

          <div className='d-flex flex-shrink-0 align-items-center gap-3'>
            <CategoryDropdown />

            <CartButton />

            <HeaderActions
              loggedIn={loggedIn}
              user={user}
              role={role}
              onLogout={handleLogout}
            />
          </div>
        </div>
      </Container>
    </Navbar>
  )
}

export default Header