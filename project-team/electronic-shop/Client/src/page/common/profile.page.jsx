import { useEffect, useRef, useState } from 'react'
import Container from 'react-bootstrap/Container'
import Row from 'react-bootstrap/Row'
import Col from 'react-bootstrap/Col'
import Card from 'react-bootstrap/Card'
import Form from 'react-bootstrap/Form'
import Modal from 'react-bootstrap/Modal'

import MainLayout from '../../components/templates/MainLayout'
import Alert from '../../components/atoms/Alert'
import Button from '../../components/atoms/Button'
import EmptyState from '../../components/atoms/EmptyState'
import LoadingText from '../../components/atoms/LoadingText'
import TextField from '../../components/atoms/TextField'
import { getErrorMessage } from '../../services/api'
import { getUserById, updateUser } from '../../services/user.service'
import { getCurrentUser, getUserId, updateStoredUser } from '../../utils/authStorage'

const initialAddressForm = {
  receiver_name: '',
  receiver_phone: '',
  province: '',
  district: '',
  ward: '',
  address_line: '',
  is_default: false,
}

function getRoleLabel(user) {
  const role = user?.role_id?.name || user?.role_id?.code || user?.role || user?.role_code || 'Customer'
  return String(role).toLowerCase() === 'customer' ? 'Khách hàng' : role
}

function getInitial(name) {
  return String(name || 'U').trim().charAt(0).toUpperCase() || 'U'
}

function getAvatar(user, form) {
  return form?.img_url || user?.img_url || user?.avatar || user?.avatar_url || ''
}

function getAddressId(address) {
  return address?._id || address?.id
}

function getReceiverName(address) {
  return address?.receive_name || address?.receiver_name || address?.receiverName || 'Người nhận'
}

function getReceiverPhone(address) {
  return address?.receive_phone || address?.receiver_phone || address?.receiverPhone || ''
}

function isDefaultAddress(address) {
  return Boolean(address?.is_default || address?.isDefault || address?.default)
}

function formatAddress(address) {
  return [
    address?.address_line,
    address?.ward,
    address?.district,
    address?.province,
  ]
    .filter(Boolean)
    .join(', ')
}

function ProfilePage() {
  const currentUser = getCurrentUser()
  const fileInputRef = useRef(null)

  const [profile, setProfile] = useState(null)

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    img_url: '',
  })

  const [addresses, setAddresses] = useState([])
  const [addressForm, setAddressForm] = useState(initialAddressForm)

  const [isEditing, setIsEditing] = useState(false)
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    let mounted = true

    const loadProfile = async () => {
      if (!currentUser) {
        setIsLoading(false)
        return
      }

      try {
        setIsLoading(true)
        setError('')
        setMessage('')

        const response = await getUserById(getUserId(currentUser))

        if (!mounted) return

        const data = response?.data || {}
        const user = data.user || data

        setProfile(user)
        setAddresses(data.addresses || [])

        setForm({
          name: user?.name || '',
          email: user?.email || '',
          phone: user?.phone || '',
          img_url: user?.img_url || '',
        })
      } catch (error) {
        if (!mounted) return
        setError(getErrorMessage(error, 'Không tải được hồ sơ tài khoản.'))
      } finally {
        if (mounted) setIsLoading(false)
      }
    }

    loadProfile()

    return () => {
      mounted = false
    }
  }, [])

  const handleChange = (event) => {
    const { name, value } = event.target

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }))

    setMessage('')
    setError('')
  }

  const handleAddressChange = (event) => {
    const { name, value, checked, type } = event.target

    setAddressForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))

    setMessage('')
    setError('')
  }

  const handleStartEdit = () => {
    setIsEditing(true)
    setMessage('')
    setError('')
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    setError('')
    setMessage('')

    setForm({
      name: profile?.name || '',
      email: profile?.email || '',
      phone: profile?.phone || '',
      img_url: profile?.img_url || '',
    })
  }

  const handleChooseAvatar = () => {
    if (!isEditing) return
    fileInputRef.current?.click()
  }

  const handleAvatarImport = (event) => {
    const file = event.target.files?.[0]

    if (!file) return

    if (!file.type.startsWith('image/')) {
      setError('Vui lòng chọn file ảnh hợp lệ.')
      return
    }

    const reader = new FileReader()

    reader.onload = () => {
      setForm((prev) => ({
        ...prev,
        img_url: reader.result,
      }))
    }

    reader.onerror = () => {
      setError('Không đọc được file ảnh.')
    }

    reader.readAsDataURL(file)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    try {
      setIsSaving(true)
      setError('')
      setMessage('')

      const response = await updateUser(getUserId(currentUser), {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        img_url: form.img_url,
      })

      const updatedUser = response?.data || response?.user || response

      updateStoredUser(updatedUser)
      setProfile(updatedUser)

      setForm({
        name: updatedUser?.name || '',
        email: updatedUser?.email || '',
        phone: updatedUser?.phone || '',
        img_url: updatedUser?.img_url || '',
      })

      setIsEditing(false)
      setMessage('Cập nhật hồ sơ thành công.')
    } catch (error) {
      setError(getErrorMessage(error, 'Không cập nhật được hồ sơ.'))
    } finally {
      setIsSaving(false)
    }
  }

  const handleOpenAddressModal = () => {
    setAddressForm(initialAddressForm)
    setIsAddressModalOpen(true)
    setError('')
    setMessage('')
  }

  const handleCloseAddressModal = () => {
    setIsAddressModalOpen(false)
    setAddressForm(initialAddressForm)
  }

  const handleAddAddress = (event) => {
    event.preventDefault()

    if (!addressForm.receiver_name.trim()) {
      setError('Vui lòng nhập tên người nhận.')
      return
    }

    if (!addressForm.receiver_phone.trim()) {
      setError('Vui lòng nhập số điện thoại người nhận.')
      return
    }

    if (!addressForm.address_line.trim()) {
      setError('Vui lòng nhập địa chỉ cụ thể.')
      return
    }

    const shouldBeDefault = addressForm.is_default || addresses.length === 0

    const newAddress = {
      ...addressForm,
      _id: `local-${Date.now()}`,
      receiver_name: addressForm.receiver_name.trim(),
      receiver_phone: addressForm.receiver_phone.trim(),
      province: addressForm.province.trim(),
      district: addressForm.district.trim(),
      ward: addressForm.ward.trim(),
      address_line: addressForm.address_line.trim(),
      is_default: shouldBeDefault,
      isDefault: shouldBeDefault,
      default: shouldBeDefault,
    }

    setAddresses((prev) => {
      if (!shouldBeDefault) return [newAddress, ...prev]

      return [
        newAddress,
        ...prev.map((item) => ({
          ...item,
          is_default: false,
          isDefault: false,
          default: false,
        })),
      ]
    })

    setMessage('Đã thêm địa chỉ vào danh sách.')
    handleCloseAddressModal()
  }

  const handleSetDefaultAddress = (targetKey) => {
    setAddresses((prev) =>
      prev.map((item, index) => {
        const itemKey = getAddressId(item) || `address-${index}`
        const isSelected = itemKey === targetKey

        return {
          ...item,
          is_default: isSelected,
          isDefault: isSelected,
          default: isSelected,
        }
      }),
    )

    setMessage('Đã cập nhật địa chỉ mặc định.')
  }

  const avatar = getAvatar(profile, form)
  const roleLabel = getRoleLabel(profile)
  const isActive = String(profile?.status || '').toLowerCase() === 'active'

  return (
    <MainLayout>
      <section className='bg-orange-50/40 py-5'>
        <Container>
          <Alert type='danger'>{error}</Alert>
          <Alert type='success'>{message}</Alert>

          {isLoading ? (
            <LoadingText />
          ) : !currentUser ? (
            <EmptyState
              icon='🔐'
              title='Bạn cần đăng nhập'
              description='Vui lòng đăng nhập để xem và cập nhật thông tin tài khoản.'
              actionLabel='Đăng nhập'
              onAction={() => window.location.assign('/login')}
            />
          ) : (
            <Row className='g-4 align-items-start'>
              <Col lg={4}>
                <Card className='card-surface overflow-hidden'>
                  <Card.Body className='p-4 text-center'>
                    <div
                      className='mx-auto mb-3 d-flex align-items-center justify-content-center rounded-circle bg-orange-500 text-4xl font-black text-white shadow-sm'
                      style={{
                        width: 132,
                        height: 132,
                        overflow: 'hidden',
                      }}
                    >
                      {avatar ? (
                        <img
                          src={avatar}
                          alt={profile?.name || 'Avatar'}
                          className='h-100 w-100 object-cover'
                          onError={(event) => {
                            event.currentTarget.style.display = 'none'
                          }}
                        />
                      ) : (
                        getInitial(profile?.name)
                      )}
                    </div>

                    <input
                      ref={fileInputRef}
                      type='file'
                      accept='image/*'
                      className='d-none'
                      onChange={handleAvatarImport}
                    />

                    <button
                      type='button'
                      disabled={!isEditing}
                      onClick={handleChooseAvatar}
                      className='mb-4 rounded-pill border border-orange-200 bg-orange-50 px-4 py-2 text-sm font-bold text-orange-600 transition hover:bg-orange-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-orange-50 disabled:hover:text-orange-600'
                    >
                      <i className='bi bi-image me-2' />
                      Import ảnh
                    </button>

                    <h2 className='mb-1 text-2xl font-black text-slate-950'>
                      {profile?.name || 'Người dùng'}
                    </h2>

                    <p className='mb-3 text-slate-500'>
                      {profile?.email}
                    </p>

                    <span
                      className={`rounded-pill px-3 py-2 text-xs font-black ${
                        isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {isActive ? 'Đang hoạt động' : profile?.status || 'Chưa xác định'}
                    </span>

                    <div className='mt-4 rounded-4 bg-slate-50 p-3 text-start'>
                      <p className='mb-1 text-xs font-black uppercase text-slate-400'>
                        Vai trò
                      </p>

                      <p className='mb-0 font-bold text-slate-700'>
                        {roleLabel}
                      </p>
                    </div>
                  </Card.Body>
                </Card>
              </Col>

              <Col lg={8}>
                <Card className='card-surface'>
                  <Card.Body className='p-4 p-lg-5'>
                    <div className='mb-4 d-flex flex-wrap align-items-center justify-content-between gap-3'>
                      <div>
                        <p className='mb-1 text-xs font-black uppercase tracking-[0.25em] text-orange-600'>
                          Thông tin
                        </p>

                        <h2 className='mb-0 text-2xl font-black text-slate-950'>
                          {isEditing ? 'Chỉnh sửa hồ sơ' : 'Thông tin tài khoản'}
                        </h2>
                      </div>

                      <div className='d-flex flex-wrap gap-2'>
                        {!isEditing && (
                          <Button onClick={handleStartEdit}>
                            Chỉnh sửa hồ sơ
                          </Button>
                        )}

                        {isEditing && (
                          <button
                            type='button'
                            onClick={handleCancelEdit}
                            className='rounded-pill border border-slate-200 bg-white px-4 py-2 font-bold text-slate-700 shadow-sm transition hover:bg-slate-100'
                          >
                            Hủy
                          </button>
                        )}
                      </div>
                    </div>

                    <Form onSubmit={handleSubmit}>
                      <Row className='g-3'>
                        <Col md={6}>
                          <TextField
                            label='Họ và tên'
                            name='name'
                            value={form.name}
                            disabled={!isEditing || isSaving}
                            onChange={handleChange}
                          />
                        </Col>

                        <Col md={6}>
                          <TextField
                            label='Email'
                            name='email'
                            type='email'
                            value={form.email}
                            disabled={!isEditing || isSaving}
                            onChange={handleChange}
                          />
                        </Col>

                        <Col md={6}>
                          <TextField
                            label='Số điện thoại'
                            name='phone'
                            value={form.phone}
                            disabled={!isEditing || isSaving}
                            onChange={handleChange}
                          />
                        </Col>

                        <Col md={6}>
                          <Form.Group>
                            <Form.Label className='mb-2 text-sm font-bold text-slate-700'>
                              Ảnh đại diện
                            </Form.Label>

                            <div className='rounded-4 border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500 shadow-sm'>
                              {avatar ? 'Đã chọn ảnh đại diện' : 'Chưa có ảnh đại diện'}
                            </div>
                          </Form.Group>
                        </Col>
                      </Row>

                      {isEditing && (
                        <div className='mt-4 d-flex flex-wrap gap-3'>
                          <Button type='submit' isLoading={isSaving}>
                            Lưu thay đổi
                          </Button>

                          <Button
                            type='button'
                            variant='secondary'
                            disabled={isSaving}
                            onClick={handleCancelEdit}
                          >
                            Hủy chỉnh sửa
                          </Button>
                        </div>
                      )}
                    </Form>
                  </Card.Body>
                </Card>

                <Card className='card-surface mt-4'>
                  <Card.Body className='p-4 p-lg-5'>
                    <div className='mb-4 d-flex flex-wrap align-items-center justify-content-between gap-3'>
                      <div>
                        <p className='mb-1 text-xs font-black uppercase tracking-[0.25em] text-orange-600'>
                          Giao hàng
                        </p>

                        <h2 className='mb-0 text-2xl font-black text-slate-950'>
                          Địa chỉ đã lưu
                        </h2>
                      </div>

                      <div className='d-flex flex-wrap align-items-center gap-2'>
                        <span className='rounded-pill bg-orange-50 px-3 py-2 text-sm font-bold text-orange-600'>
                          {addresses.length} địa chỉ
                        </span>

                        <Button type='button' onClick={handleOpenAddressModal}>
                          Thêm địa chỉ
                        </Button>
                      </div>
                    </div>

                    {addresses.length === 0 ? (
                      <div className='rounded-4 border border-dashed border-slate-300 bg-slate-50 p-4 text-center'>
                        <div className='mb-2 text-3xl'>📍</div>

                        <p className='mb-0 font-bold text-slate-600'>
                          Chưa có địa chỉ lưu sẵn.
                        </p>
                      </div>
                    ) : (
                      <Row className='g-3'>
                        {addresses.map((address, index) => {
                          const addressKey = getAddressId(address) || `address-${index}`
                          const isDefault = isDefaultAddress(address)

                          return (
                            <Col md={6} key={addressKey}>
                              <div
                                className={`h-100 rounded-4 border bg-white p-4 shadow-sm transition ${
                                  isDefault ? 'border-emerald-300' : 'border-slate-200'
                                }`}
                              >
                                <div className='mb-3 d-flex align-items-start gap-3'>
                                  <button
                                    type='button'
                                    onClick={() => handleSetDefaultAddress(addressKey)}
                                    className={`d-flex align-items-center justify-content-center rounded-circle border shadow-sm transition ${
                                      isDefault
                                        ? 'border-emerald-500 bg-emerald-500 text-white'
                                        : 'border-slate-200 bg-white text-transparent hover:border-orange-500 hover:bg-orange-50'
                                    }`}
                                    style={{
                                      width: 24,
                                      height: 24,
                                      minWidth: 24,
                                      marginTop: 8,
                                    }}
                                    title={isDefault ? 'Địa chỉ mặc định' : 'Chọn làm mặc định'}
                                    aria-label={isDefault ? 'Địa chỉ mặc định' : 'Chọn làm mặc định'}
                                  >
                                    {isDefault && (
                                      <i
                                        className='bi bi-check-lg'
                                        style={{
                                          fontSize: 12,
                                          lineHeight: 1,
                                        }}
                                      />
                                    )}
                                  </button>

                                  <span
                                    className='d-flex align-items-center justify-content-center rounded-circle bg-orange-50 text-orange-600'
                                    style={{
                                      width: 42,
                                      height: 42,
                                      minWidth: 42,
                                    }}
                                  >
                                    <i className='bi bi-geo-alt-fill' />
                                  </span>

                                  <div>
                                    <h3 className='mb-1 text-base font-black text-slate-950'>
                                      {getReceiverName(address)}
                                    </h3>

                                    <p className='mb-0 text-sm text-slate-500'>
                                      {getReceiverPhone(address)}
                                    </p>
                                  </div>
                                </div>

                                <div className='rounded-4 bg-slate-50 p-3'>
                                  <p className='mb-0 text-sm leading-7 text-slate-600'>
                                    {formatAddress(address)}
                                  </p>
                                </div>
                              </div>
                            </Col>
                          )
                        })}
                      </Row>
                    )}
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          )}
        </Container>
      </section>

      <Modal
        show={isAddressModalOpen}
        onHide={handleCloseAddressModal}
        centered
        size='lg'
      >
        <Modal.Header closeButton className='border-0 px-4 pt-4'>
          <div>
            <p className='mb-1 text-xs font-black uppercase tracking-[0.25em] text-orange-600'>
              Giao hàng
            </p>

            <Modal.Title className='font-black text-slate-950'>
              Thêm địa chỉ mới
            </Modal.Title>
          </div>
        </Modal.Header>

        <Form onSubmit={handleAddAddress}>
          <Modal.Body className='px-4'>
            <Row className='g-3'>
              <Col md={6}>
                <TextField
                  label='Tên người nhận'
                  name='receiver_name'
                  value={addressForm.receiver_name}
                  onChange={handleAddressChange}
                />
              </Col>

              <Col md={6}>
                <TextField
                  label='Số điện thoại'
                  name='receiver_phone'
                  value={addressForm.receiver_phone}
                  onChange={handleAddressChange}
                />
              </Col>

              <Col md={4}>
                <TextField
                  label='Tỉnh / Thành phố'
                  name='province'
                  value={addressForm.province}
                  onChange={handleAddressChange}
                />
              </Col>

              <Col md={4}>
                <TextField
                  label='Quận / Huyện'
                  name='district'
                  value={addressForm.district}
                  onChange={handleAddressChange}
                />
              </Col>

              <Col md={4}>
                <TextField
                  label='Phường / Xã'
                  name='ward'
                  value={addressForm.ward}
                  onChange={handleAddressChange}
                />
              </Col>

              <Col xs={12}>
                <TextField
                  label='Địa chỉ cụ thể'
                  name='address_line'
                  value={addressForm.address_line}
                  onChange={handleAddressChange}
                />
              </Col>

              <Col xs={12}>
                <Form.Check
                  type='checkbox'
                  id='is_default'
                  name='is_default'
                  checked={addressForm.is_default}
                  onChange={handleAddressChange}
                  label='Đặt làm địa chỉ mặc định'
                  className='font-bold text-slate-700'
                />
              </Col>
            </Row>
          </Modal.Body>

          <Modal.Footer className='border-0 px-4 pb-4'>
            <button
              type='button'
              onClick={handleCloseAddressModal}
              className='rounded-pill border border-slate-200 bg-white px-4 py-2 font-bold text-slate-700 shadow-sm transition hover:bg-slate-100'
            >
              Hủy
            </button>

            <Button type='submit'>
              Thêm địa chỉ
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </MainLayout>
  )
}

export default ProfilePage