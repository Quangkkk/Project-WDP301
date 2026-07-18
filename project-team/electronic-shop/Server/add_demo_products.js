const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Product = require('./models/Product.model');
const ProductVariant = require('./models/ProductVariant.model');

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/WDP301';

const categories = {
  Laptop: "665000000000000000000201",
  Phone: "665000000000000000000202",
  Accessories: "665000000000000000000203",
  Tablet: "665000000000000000000204",
  Smartwatch: "665000000000000000000205",
  Monitor: "665000000000000000000206",
  Network: "665000000000000000000207",
  Console: "665000000000000000000208"
};

const brands = {
  Apple: "665000000000000000000301",
  Samsung: "665000000000000000000302",
  Dell: "665000000000000000000303",
  Sony: "665000000000000000000304",
  Xiaomi: "665000000000000000000305",
  ASUS: "665000000000000000000306",
  Lenovo: "665000000000000000000307",
  HP: "665000000000000000000308",
  Logitech: "665000000000000000000309",
  TPLink: "665000000000000000000310"
};

const newProducts = [
  {
    _id: new mongoose.Types.ObjectId(),
    name: "PlayStation 5 Slim Edition",
    sku: "PS5-SLIM-NEW",
    description: "Phiên bản nhỏ gọn hơn của máy console mạnh mẽ nhất từ Sony. Tương thích đĩa vật lý. (Giá tham khảo).",
    brand_id: brands.Sony,
    category_id: categories.Console,
    total_review: 3,
    average_rating: 4.7,
    rating_count: 3,
    status: "active",
    is_featured: true,
    variants: [
      {
        sku: "PS5-SLIM-NEW-STANDARD",
        variant_value: "Standard Edition 1TB",
        price: 15990000,
        sale_price: 14990000,
        image: "https://images.unsplash.com/photo-1606813907291-d86efa9b90cd?auto=format&fit=crop&q=80&w=800",
        attributes_json: { version: "Standard Edition", storage: "1TB" },
        weight: 3.2,
        stock_quantity: 10,
        is_active: true
      }
    ]
  },
  {
    _id: new mongoose.Types.ObjectId(),
    name: "ASUS ROG Strix G16",
    sku: "ASUS-ROG-G16-NEW",
    description: "Laptop gaming hiệu năng khủng với hệ thống tản nhiệt thông minh, đáp ứng mọi tựa game e-sports. (Giá ước lượng).",
    brand_id: brands.ASUS,
    category_id: categories.Laptop,
    total_review: 6,
    average_rating: 4.6,
    rating_count: 6,
    status: "active",
    is_featured: true,
    variants: [
      {
        sku: "ASUS-ROG-G16-NEW-RTX4060",
        variant_value: "i7-13650HX - RTX 4060 - 16GB",
        price: 36990000,
        sale_price: 34990000,
        image: "https://images.unsplash.com/photo-1593640408182-31c70c8268f5?auto=format&fit=crop&q=80&w=800",
        attributes_json: { cpu: "i7-13650HX", gpu: "RTX 4060", ram: "16GB" },
        weight: 2.5,
        stock_quantity: 5,
        is_active: true
      }
    ]
  },
  {
    _id: new mongoose.Types.ObjectId(),
    name: "Xiaomi 14 Ultra",
    sku: "XIAOMI-14-ULTRA",
    description: "Điện thoại thông minh chụp ảnh chuyên nghiệp với ống kính Leica, hiệu năng Snapdragon 8 Gen 3. (Dữ liệu tham khảo).",
    brand_id: brands.Xiaomi,
    category_id: categories.Phone,
    total_review: 8,
    average_rating: 4.8,
    rating_count: 8,
    status: "active",
    is_featured: true,
    variants: [
      {
        sku: "XIAOMI-14-ULTRA-512GB",
        variant_value: "512GB - Đen",
        price: 29990000,
        sale_price: 28990000,
        image: "https://images.unsplash.com/photo-1598327105666-5b89351cb31b?auto=format&fit=crop&q=80&w=800",
        attributes_json: { color: "Đen", storage: "512GB" },
        weight: 0.22,
        stock_quantity: 12,
        is_active: true
      }
    ]
  },
  {
    _id: new mongoose.Types.ObjectId(),
    name: "Samsung Galaxy Watch 6 Classic",
    sku: "SAMSUNG-WATCH-6-CLASSIC",
    description: "Đồng hồ thông minh với viền xoay vật lý trứ danh, màn hình sáng rõ, theo dõi sức khỏe chuyên sâu.",
    brand_id: brands.Samsung,
    category_id: categories.Smartwatch,
    total_review: 4,
    average_rating: 4.5,
    rating_count: 4,
    status: "active",
    is_featured: true,
    variants: [
      {
        sku: "SS-WATCH-6-CLASSIC-47MM",
        variant_value: "47mm - Đen",
        price: 8990000,
        sale_price: 7990000,
        image: "https://images.unsplash.com/photo-1579586337278-3befd40fd17a?auto=format&fit=crop&q=80&w=800",
        attributes_json: { size: "47mm", color: "Đen" },
        weight: 0.059,
        stock_quantity: 20,
        is_active: true
      }
    ]
  }
];

async function seedProducts() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    for (const prodData of newProducts) {
      const { variants, ...prodFields } = prodData;
      
      const newProduct = new Product(prodFields);
      await newProduct.save();
      
      for (const variantData of variants) {
        const newVariant = new ProductVariant({
          ...variantData,
          product_id: newProduct._id
        });
        await newVariant.save();
      }
      
      console.log(`Inserted product: ${newProduct.name}`);
    }

    console.log('Seed completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
}

seedProducts();
