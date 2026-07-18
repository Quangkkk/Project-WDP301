import { useEffect, useRef, useState } from 'react'
import Container from 'react-bootstrap/Container'
import Row from 'react-bootstrap/Row'
import Col from 'react-bootstrap/Col'
import Card from 'react-bootstrap/Card'
import Form from 'react-bootstrap/Form'
import Modal from 'react-bootstrap/Modal'
import { Link } from 'react-router-dom'

import MainLayout from '../../components/templates/MainLayout'
import Alert from '../../components/atoms/Alert'
import Button from '../../components/atoms/Button'
import EmptyState from '../../components/atoms/EmptyState'
import LoadingText from '../../components/atoms/LoadingText'
import SelectField from '../../components/atoms/SelectField'
import TextField from '../../components/atoms/TextField'
import { getErrorMessage } from '../../services/api'
import {
  createAddress,
  getUserById,
  updateAddress,
  updateUser,
} from '../../services/user.service'
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

function buildLocationOptions(options, placeholder) {
  return [
    { value: '', label: placeholder },
    ...options,
  ]
}

function getRoleLabel(user) {
  const role =
    user?.role_id?.name ||
    user?.role_id?.code ||
    user?.role ||
    user?.role_code ||
    'Customer'

  return String(role).toLowerCase() === 'customer' ? 'Khách hàng' : role
}

function getInitial(name) {
  return String(name || 'U').trim().charAt(0).toUpperCase() || 'U'
}

function getAvatar(user, form, preview) {
  return preview || form?.img_url || user?.img_url || user?.avatar || user?.avatar_url || ''
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
  return Boolean(address?.is_default)
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

function resizeImageToDataUrl(file, maxSize = 520, quality = 0.78) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = () => {
      const img = new Image()

      img.onload = () => {
        const canvas = document.createElement('canvas')
        const context = canvas.getContext('2d')

        let { width, height } = img

        if (width > height && width > maxSize) {
          height = Math.round((height * maxSize) / width)
          width = maxSize
        } else if (height >= width && height > maxSize) {
          width = Math.round((width * maxSize) / height)
          height = maxSize
        }

        canvas.width = width
        canvas.height = height
        context.drawImage(img, 0, 0, width, height)

        resolve(canvas.toDataURL('image/jpeg', quality))
      }

      img.onerror = () => reject(new Error('Không đọc được ảnh.'))
      img.src = reader.result
    }

    reader.onerror = () => reject(new Error('Không đọc được file ảnh.'))
    reader.readAsDataURL(file)
  })
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
  const [locations, setLocations] = useState([])
  const [districtOptions, setDistrictOptions] = useState([])
  const [wardOptions, setWardOptions] = useState([])
  const [locationsError, setLocationsError] = useState('')

  const [avatarPreview, setAvatarPreview] = useState('')
  const [avatarFileName, setAvatarFileName] = useState('')

  const [isEditing, setIsEditing] = useState(false)
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isUpdatingAddress, setIsUpdatingAddress] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const loadProfile = async () => {
    if (!currentUser) {
      setIsLoading(false)
      return
    }

    const response = await getUserById(getUserId(currentUser))
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
  }

  useEffect(() => {
    let mounted = true

    const init = async () => {
      try {
        setIsLoading(true)
        setError('')
        setMessage('')

        await loadProfile()
      } catch (error) {
        if (!mounted) return
        setError(getErrorMessage(error, 'Không tải được hồ sơ tài khoản.'))
      } finally {
        if (mounted) setIsLoading(false)
      }
    }

    init()

    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    const loadLocations = async () => {
      try {
        const response = await fetch('https://provinces.open-api.vn/api/?depth=3')
        const data = await response.json()

        if (!Array.isArray(data)) {
          throw new Error('Dữ liệu địa chỉ không hợp lệ.')
        }

        setLocations(data)
        setLocationsError('')
      } catch (error) {
        setLocations([])
        setDistrictOptions([])
        setWardOptions([])
        setLocationsError('Không tải được danh sách địa chỉ. Vui lòng thử lại sau.')
      }
    }

    loadLocations()
  }, [])

  useEffect(() => {
    const province = locations.find((item) => item.name === addressForm.province)
    const districts = province?.districts || []

    setDistrictOptions(
      districts.map((district) => ({
        value: district.name,
        label: district.name,
      })),
    )
    setWardOptions([])
  }, [addressForm.province, locations])

  useEffect(() => {
    const province = locations.find((item) => item.name === addressForm.province)
    const district = province?.districts?.find((item) => item.name === addressForm.district)
    const wards = district?.wards || []

    setWardOptions(
      wards.map((ward) => ({
        value: ward.name,
        label: ward.name,
      })),
    )
  }, [addressForm.province, addressForm.district, locations])

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
      ...(name === 'province' ? { district: '', ward: '' } : {}),
      ...(name === 'district' ? { ward: '' } : {}),
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
    setAvatarPreview('')
    setAvatarFileName('')

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

  const handleAvatarImport = async (event) => {
    const file = event.target.files?.[0]

    if (!file) return

    if (!file.type.startsWith('image/')) {
      setError('Vui lòng chọn file ảnh hợp lệ.')
      return
    }

    try {
      setError('')
      setMessage('')

      const compressedDataUrl = await resizeImageToDataUrl(file)

      setAvatarPreview(compressedDataUrl)
      setAvatarFileName(file.name)

      setForm((prev) => ({
        ...prev,
        img_url: compressedDataUrl,
      }))
    } catch (error) {
      setError(error.message || 'Không đọc được file ảnh.')
    } finally {
      event.target.value = ''
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    try {
      setIsSaving(true)
      setError('')
      setMessage('')

      const payload = {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
      }

      if (form.img_url) {
        payload.img_url = form.img_url
      }

      const response = await updateUser(getUserId(currentUser), payload)
      const updatedUser = response?.data || response?.user || response

      updateStoredUser(updatedUser)
      setProfile(updatedUser)

      setForm({
        name: updatedUser?.name || '',
        email: updatedUser?.email || '',
        phone: updatedUser?.phone || '',
        img_url: updatedUser?.img_url || '',
      })

      setAvatarPreview('')
      setAvatarFileName('')
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

  const handleAddAddress = async (event) => {
    event.preventDefault()

    if (!addressForm.receiver_name.trim()) {
      setError('Vui lòng nhập tên người nhận.')
      return
    }

    if (!addressForm.receiver_phone.trim()) {
      setError('Vui lòng nhập số điện thoại người nhận.')
      return
    }

    if (!addressForm.province.trim()) {
      setError('Vui lòng nhập tỉnh / thành phố.')
      return
    }

    if (!addressForm.district.trim()) {
      setError('Vui lòng nhập quận / huyện.')
      return
    }

    if (!addressForm.ward.trim()) {
      setError('Vui lòng nhập phường / xã.')
      return
    }

    if (!addressForm.address_line.trim()) {
      setError('Vui lòng nhập địa chỉ cụ thể.')
      return
    }

    try {
      setIsUpdatingAddress(true)
      setError('')
      setMessage('')

      await createAddress(getUserId(currentUser), {
        receive_name: addressForm.receiver_name.trim(),
        receive_phone: addressForm.receiver_phone.trim(),
        receiver_name: addressForm.receiver_name.trim(),
        receiver_phone: addressForm.receiver_phone.trim(),
        province: addressForm.province.trim(),
        district: addressForm.district.trim(),
        ward: addressForm.ward.trim(),
        address_line: addressForm.address_line.trim(),
        is_default: addressForm.is_default || addresses.length === 0,
      })

      await loadProfile()

      setMessage('Đã thêm địa chỉ vào danh sách.')
      handleCloseAddressModal()
    } catch (error) {
      setError(getErrorMessage(error, 'Không thêm được địa chỉ.'))
    } finally {
      setIsUpdatingAddress(false)
    }
  }

  const handleSetDefaultAddress = async (addressId) => {
    if (!addressId) return

    try {
      setIsUpdatingAddress(true)
      setError('')
      setMessage('')

      await updateAddress(addressId, {
        is_default: true,
      })

      await loadProfile()

      setMessage('Đã cập nhật địa chỉ mặc định.')
    } catch (error) {
      setError(getErrorMessage(error, 'Không cập nhật được địa chỉ mặc định.'))
    } finally {
      setIsUpdatingAddress(false)
    }
  }

  const avatar = getAvatar(profile, form, avatarPreview)
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
                      className='mb-3 rounded-pill border border-orange-200 bg-orange-50 px-4 py-2 text-sm font-bold text-orange-600 transition hover:bg-orange-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-orange-50 disabled:hover:text-orange-600'
                    >
                      <i className='bi bi-image me-2' />
                      Import ảnh
                    </button>

                    {avatarFileName && (
                      <p className='mb-4 text-xs font-bold text-slate-500'>
                        Đã chọn: {avatarFileName}
                      </p>
                    )}

                    {!avatarFileName && <div className='mb-4' />}

                    <h2 className='mb-1 text-2xl font-black text-slate-950'>
                      {profile?.name || 'Người dùng'}
                    </h2>

                    <p className='mb-3 text-slate-500'>
                      {profile?.email}
                    </p>
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
                          <>
                            <Button
                              as={Link}
                              to='/profile/change-password'
                              variant='secondary'
                            >
                              <i className='bi bi-shield-lock me-2' />
                              Đổi mật khẩu
                            </Button>

                            <Button onClick={handleStartEdit}>
                              Chỉnh sửa hồ sơ
                            </Button>
                          </>
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

                        <Button
                          type='button'
                          onClick={handleOpenAddressModal}
                          disabled={isUpdatingAddress}
                        >
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
                          const addressId = getAddressId(address)
                          const addressKey = addressId || `address-${index}`
                          const isDefault = isDefaultAddress(address)

                          return (
                            <Col md={6} key={addressKey}>
                              <div
                                className={`h-100 rounded-4 border bg-white p-4 shadow-sm transition ${isDefault ? 'border-emerald-300' : 'border-slate-200'
                                  }`}
                              >
                                <div className='mb-3 d-flex align-items-start gap-3'>
                                  <button
                                    type='button'
                                    onClick={() => handleSetDefaultAddress(addressId)}
                                    disabled={isUpdatingAddress || !addressId || isDefault}
                                    className={`d-flex align-items-center justify-content-center rounded-circle border shadow-sm transition ${isDefault
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
                <SelectField
                  label='Tỉnh / Thành phố'
                  name='province'
                  value={addressForm.province}
                  onChange={handleAddressChange}
                  options={buildLocationOptions(
                    locations.map((province) => ({
                      value: province.name,
                      label: province.name,
                    })),
                    locations.length
                      ? 'Chọn tỉnh / thành phố'
                      : 'Đang tải tỉnh / thành phố...',
                  )}
                />
              </Col>

              <Col md={4}>
                <SelectField
                  label='Quận / Huyện'
                  name='district'
                  value={addressForm.district}
                  onChange={handleAddressChange}
                  options={buildLocationOptions(
                    districtOptions,
                    addressForm.province
                      ? districtOptions.length
                        ? 'Chọn quận / huyện'
                        : 'Không có quận / huyện'
                      : 'Chọn tỉnh / thành phố trước',
                  )}
                  disabled={!addressForm.province || districtOptions.length === 0}
                />
              </Col>

              <Col md={4}>
                <SelectField
                  label='Phường / Xã'
                  name='ward'
                  value={addressForm.ward}
                  onChange={handleAddressChange}
                  options={buildLocationOptions(
                    wardOptions,
                    addressForm.district
                      ? wardOptions.length
                        ? 'Chọn phường / xã'
                        : 'Không có phường / xã'
                      : 'Chọn quận / huyện trước',
                  )}
                  disabled={!addressForm.district || wardOptions.length === 0}
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
              disabled={isUpdatingAddress}
              className='rounded-pill border border-slate-200 bg-white px-4 py-2 font-bold text-slate-700 shadow-sm transition hover:bg-slate-100 disabled:opacity-50'
            >
              Hủy
            </button>

            <Button type='submit' isLoading={isUpdatingAddress}>
              Thêm địa chỉ
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </MainLayout>
  )
}

export default ProfilePage