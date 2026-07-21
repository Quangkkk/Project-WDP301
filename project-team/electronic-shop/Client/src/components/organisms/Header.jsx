import { useEffect, useState, useRef } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { Search, X, LayoutGrid, ShoppingCart, Truck } from 'lucide-react'

import BrandLogo from '../atoms/BrandLogo'
import HeaderActions from '../molecules/HeaderActions'
import {
  AUTH_UPDATED_EVENT,
  clearAuth,
  getCurrentUser,
  getUserRole,
  isAuthenticated,
} from '../../utils/authStorage'
import { getCategories } from '../../services/product.service'
import { pickArray } from '../../utils/format'
import TrackOrderModal from './TrackOrderModal'

const PROTECTED_PATH_PREFIXES = [
  '/orders',
  '/wishlist',
  '/profile',
  '/support',
  '/chat',
  '/admin',
  '/management',
  '/manager',
  '/staff',
]

function isProtectedPath(pathname = '') {
  return PROTECTED_PATH_PREFIXES.some(
    (prefix) =>
      pathname === prefix ||
      pathname.startsWith(`${prefix}/`),
  )
}

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
    <form onSubmit={handleSubmit} className={`w-full ${className}`}>
      <div className='flex items-center gap-2 !rounded-full border border-slate-200 bg-slate-50 px-4 py-2 transition-all focus-within:border-blue-500 focus-within:bg-white focus-within:shadow-md focus-within:ring-2 focus-within:ring-blue-100'>
        <Search className='w-5 h-5 text-slate-400 shrink-0' />
        <input
          type='text'
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          placeholder='Tìm kiếm sản phẩm công nghệ...'
          className='w-full bg-transparent border-0 p-0 text-sm focus:outline-none focus:ring-0 text-slate-700 placeholder-slate-400'
        />
        {keyword && (
          <button
            type='button'
            className='shrink-0 text-slate-400 hover:text-slate-700 transition-colors focus:outline-none !rounded-full p-1 hover:bg-slate-100'
            onClick={handleClear}
            aria-label='Xóa nội dung tìm kiếm'
          >
            <X className='w-4 h-4' />
          </button>
        )}
      </div>
    </form>
  )
}

function CategoryDropdown() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const selectedCategoryId = searchParams.get('categoryId') || ''
  const [categories, setCategories] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef(null)

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
    return () => { mounted = false }
  }, [])

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const selectedCategory = categories.find((category) => {
    const id = category._id || category.id
    return String(id) === String(selectedCategoryId)
  })

  const handleSelectCategory = (categoryId = '') => {
    setIsOpen(false)
    if (!categoryId) {
      navigate('/products')
      return
    }
    const params = new URLSearchParams()
    params.set('categoryId', categoryId)
    navigate(`/products?${params.toString()}`)
  }

  return (
    <div className='relative' ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className='flex items-center gap-2 !rounded-full border border-slate-200 bg-white px-4 py-2 font-bold text-slate-700 shadow-sm hover:bg-slate-50 transition-colors focus:outline-none'
      >
        <LayoutGrid className='w-5 h-5 text-blue-600' />
        <span className='hidden xl:inline'>
          {selectedCategory?.name || 'Danh mục'}
        </span>
      </button>

      {isOpen && (
        <div className='absolute right-0 mt-2 w-56 !rounded-xl bg-white border border-slate-100 shadow-xl z-50 overflow-hidden py-1'>
          <button
            onClick={() => handleSelectCategory('')}
            className={`w-full text-left px-4 py-2 text-sm font-medium transition-colors ${!selectedCategoryId ? 'bg-blue-50 text-blue-600 font-bold' : 'text-slate-700 hover:bg-slate-50'
              }`}
          >
            Tất cả sản phẩm
          </button>
          <div className='my-1 border-t border-slate-100' />

          {isLoading && (
            <div className='px-4 py-2 text-sm text-slate-500'>Đang tải danh mục...</div>
          )}
          {!isLoading && categories.length === 0 && (
            <div className='px-4 py-2 text-sm text-slate-500'>Chưa có danh mục</div>
          )}
          {!isLoading && categories.map((category) => {
            const categoryId = category._id || category.id
            const isActive = String(categoryId) === String(selectedCategoryId)
            return (
              <button
                key={categoryId}
                onClick={() => handleSelectCategory(categoryId)}
                className={`w-full text-left px-4 py-2 text-sm transition-colors ${isActive ? 'bg-blue-50 font-bold text-blue-600' : 'text-slate-700 hover:bg-slate-50 font-medium'
                  }`}
              >
                {category.name}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

function CartButton() {
  const navigate = useNavigate()
  const location = useLocation()
  const isActive = location.pathname === '/cart'

  return (
    <button
      onClick={() => navigate('/cart')}
      className={`relative flex items-center justify-center w-11 h-11 !rounded-full shadow-sm transition-colors focus:outline-none ${isActive ? 'bg-orange-600 text-white' : 'bg-orange-50 text-orange-600 hover:bg-orange-100'
        }`}
      aria-label='Giỏ hàng'
    >
      <ShoppingCart className='w-5 h-5' />
      {!isActive && (
        <span className='absolute top-2 right-2 w-2.5 h-2.5 bg-orange-600 !rounded-full border-2 border-white' />
      )}
    </button>
  )
}

function Header() {
  const navigate = useNavigate()
  const location = useLocation()
  const [authState, setAuthState] = useState(() => ({
    user: getCurrentUser(),
    loggedIn: isAuthenticated(),
  }))
  const [showTrackModal, setShowTrackModal] = useState(false)

  useEffect(() => {
    const refreshAuth = () => {
      setAuthState({
        user: getCurrentUser(),
        loggedIn: isAuthenticated(),
      })
    }

    window.addEventListener(AUTH_UPDATED_EVENT, refreshAuth)
    window.addEventListener('storage', refreshAuth)

    return () => {
      window.removeEventListener(AUTH_UPDATED_EVENT, refreshAuth)
      window.removeEventListener('storage', refreshAuth)
    }
  }, [])

  const { user, loggedIn } = authState
  const role = getUserRole(user)

  const handleLogout = () => {
    const currentPath = `${location.pathname}${location.search}${location.hash}`
    const requiresAuthentication = isProtectedPath(location.pathname)

    clearAuth()

    if (requiresAuthentication) {
      navigate('/login', {
        replace: true,
        state: { from: currentPath },
      })
      return
    }

    // Giữ nguyên URL hiện tại nhưng tải lại trang để toàn bộ component
    // cập nhật sang trạng thái guest, tránh giữ dữ liệu customer cũ.
    window.location.reload()
  }

  return (
    <>
      <header className='sticky top-0 z-40 w-full border-b border-slate-200 bg-white/95 backdrop-blur-sm shadow-sm'>
        <div className='container mx-auto px-4 py-3'>
          <div className='flex w-full items-center gap-4'>
            {/* Logo */}
            <div className='shrink-0'>
              <BrandLogo />
            </div>

            {/* Search */}
            <div className='flex-1 flex justify-center px-2 md:px-6'>
              <div className='w-full max-w-lg'>
                <HeaderSearch />
              </div>
            </div>

            <div className='flex shrink-0 items-center gap-3'>
              {!loggedIn && (
                <button
                  type='button'
                  onClick={() => setShowTrackModal(true)}
                  className='flex items-center gap-2 !rounded-full bg-blue-50 px-4 py-2 font-bold text-blue-600 transition-colors hover:bg-blue-100 focus:outline-none'
                  title='Tra cứu đơn hàng'
                >
                  <Truck className='h-5 w-5' />

                  <span className='hidden xl:inline'>
                    Tra cứu đơn
                  </span>
                </button>
              )}

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
        </div>
      </header>

      {!loggedIn && (
        <TrackOrderModal
          show={showTrackModal}
          onHide={() => setShowTrackModal(false)}
        />
      )}
    </>
  )
}

export default Header