import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import ProtectedRoute from './components/templates/ProtectedRoute.jsx'

import HomePage from './page/customer/home.page.jsx'
import LoginPage from './page/customer/login.page.jsx'
import RegisterPage from './page/customer/register.page.jsx'
import ProductListPage from './page/customer/product-list.page.jsx'
import ProductDetailPage from './page/customer/product-detail.page.jsx'
import CartPage from './page/customer/cart.page.jsx'
import CheckoutPage from './page/customer/checkout.page.jsx'
import PaymentResultPage from './page/customer/payment-result.page.jsx'
import OrderHistoryPage from './page/customer/order-history.page.jsx'
import ProfilePage from './page/customer/profile.page.jsx'
import SupportPage from './page/customer/support.page.jsx'

import AdminDashboardPage from './page/admin/admin-dashboard.page.jsx'
import ProductManagementPage from './page/admin/product-management.page.jsx'
import CategoryManagementPage from './page/admin/category-management.page.jsx'
import BrandManagementPage from './page/admin/brand-management.page.jsx'
import CouponManagementPage from './page/admin/coupon-management.page.jsx'
import OrderManagementPage from './page/admin/order-management.page.jsx'
import StaffManagementPage from './page/admin/user-management.page.jsx'
import SupportManagementPage from './page/admin/support-management.page.jsx'
import RevenueAnalyticsPage from './page/admin/revenue-analytics.page.jsx'

const customerOnly = ['CUSTOMER']
const backOfficeRoles = ['ADMIN', 'MANAGER', 'STAFF']
const orderAndTicketRoles = ['ADMIN', 'STAFF']
const managerOnly = ['MANAGER']
const adminOnly = ['ADMIN']

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path='/' element={<HomePage />} />
        <Route path='/login' element={<LoginPage />} />
        <Route path='/register' element={<RegisterPage />} />
        <Route path='/products' element={<ProductListPage />} />
        <Route path='/products/:id' element={<ProductDetailPage />} />
        <Route path='/product' element={<Navigate to='/products' replace />} />
        <Route path='/cart' element={<CartPage />} />

        <Route path='/checkout' element={<CheckoutPage />} />
        <Route path='/payment-result/:orderId' element={<PaymentResultPage />} />

        <Route
          path='/orders'
          element={
            <ProtectedRoute allowedRoles={customerOnly}>
              <OrderHistoryPage />
            </ProtectedRoute>
          }
        />

        <Route
          path='/profile'
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />

        <Route
          path='/support'
          element={
            <ProtectedRoute allowedRoles={customerOnly}>
              <SupportPage />
            </ProtectedRoute>
          }
        />

        <Route
          path='/admin'
          element={
            <ProtectedRoute allowedRoles={backOfficeRoles}>
              <AdminDashboardPage />
            </ProtectedRoute>
          }
        />

        <Route
          path='/admin/products'
          element={
            <ProtectedRoute allowedRoles={managerOnly}>
              <ProductManagementPage />
            </ProtectedRoute>
          }
        />

        <Route
          path='/admin/categories'
          element={
            <ProtectedRoute allowedRoles={managerOnly}>
              <CategoryManagementPage />
            </ProtectedRoute>
          }
        />

        <Route
          path='/admin/brands'
          element={
            <ProtectedRoute allowedRoles={managerOnly}>
              <BrandManagementPage />
            </ProtectedRoute>
          }
        />

        <Route
          path='/admin/coupons'
          element={
            <ProtectedRoute allowedRoles={managerOnly}>
              <CouponManagementPage />
            </ProtectedRoute>
          }
        />

        <Route
          path='/admin/orders'
          element={
            <ProtectedRoute allowedRoles={orderAndTicketRoles}>
              <OrderManagementPage />
            </ProtectedRoute>
          }
        />

        <Route
          path='/admin/staff'
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}>
              <StaffManagementPage />
            </ProtectedRoute>
          }
        />

        <Route
          path='/admin/support'
          element={
            <ProtectedRoute allowedRoles={orderAndTicketRoles}>
              <SupportManagementPage />
            </ProtectedRoute>
          }
        />

        <Route
          path='/admin/revenue'
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}>
              <RevenueAnalyticsPage />
            </ProtectedRoute>
          }
        />

        <Route path='*' element={<Navigate to='/' replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App