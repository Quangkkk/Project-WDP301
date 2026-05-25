# TechHome — WDP301 Frontend UI

Giao diện đơn giản, màu dễ nhìn, bám theo use case trong bảng WDP301.

## Phân quyền & trang

| Role | Use case | Trang UI |
|------|----------|----------|
| **Guest** | Sign in / Sign out, xem category, brand, product | `index.html`, `products.html`, `product-detail.html`, `login.html` |
| **User** | Payment, Change password, Forgot password, Get/Update/Delete user | `profile.html`, `checkout.html`, `forgot-password.html` |
| **Admin** | CRUD user, category, brand, product, productDetail | `admin.html` (menu trái từng entity) |

## Chạy project

```powershell
cd "d:\SUMMER_2026\WDP301\Tech Home web"
npx --yes serve . -l 3000
```

Mở: http://localhost:3000

Hoặc double-click `index.html`.

## Cấu trúc

- `css/design-system.css` — màu nhẹ (#2563eb, nền #f8fafc)
- `css/components.css` — header, card, table, admin layout
- `admin.html` — 5 panel: Users, Categories, Brands, Products, Product Details
- Chỉ frontend, không backend
