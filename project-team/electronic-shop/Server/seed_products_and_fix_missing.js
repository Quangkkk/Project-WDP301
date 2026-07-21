const mongoose = require("mongoose");
const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.join(__dirname, ".env") });

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/WDP301";

const Product = require("./models/Product.model");
const ProductVariant = require("./models/ProductVariant.model");
const Category = require("./models/Category.model");
const Brand = require("./models/Brand.model");

// Curated high-resolution tech images from Unsplash by category
const DEFAULT_IMAGES = {
  laptop: [
    "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1541807084-5c52b6b3adef?auto=format&fit=crop&w=800&q=80",
  ],
  phone: [
    "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1592750475338-74b7b21085ab?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1565849904461-04a58ad377e0?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1580910051074-3eb694886505?auto=format&fit=crop&w=800&q=80",
  ],
  accessory: [
    "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1608156639585-34a0a56ee6c9?auto=format&fit=crop&w=800&q=80",
  ],
  tablet: [
    "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1561154464-82e9adf32764?auto=format&fit=crop&w=800&q=80",
  ],
  watch: [
    "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?auto=format&fit=crop&w=800&q=80",
  ],
  monitor: [
    "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1585792180666-f7347c490ee2?auto=format&fit=crop&w=800&q=80",
  ],
  network: [
    "https://images.unsplash.com/photo-1544197150-b99a580bb7a8?auto=format&fit=crop&w=800&q=80",
  ],
  gaming: [
    "https://images.unsplash.com/photo-1606813907291-d86efa9b94db?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=800&q=80",
  ],
};

function getFallbackImage(productName, categoryName) {
  const name = (productName + " " + categoryName).toLowerCase();
  if (name.includes("laptop") || name.includes("macbook") || name.includes("thinkpad") || name.includes("xps") || name.includes("pavilion") || name.includes("zephyrus")) {
    return DEFAULT_IMAGES.laptop[Math.floor(Math.random() * DEFAULT_IMAGES.laptop.length)];
  }
  if (name.includes("iphone") || name.includes("galaxy s") || name.includes("xiaomi") || name.includes("điện thoại") || name.includes("phone")) {
    return DEFAULT_IMAGES.phone[Math.floor(Math.random() * DEFAULT_IMAGES.phone.length)];
  }
  if (name.includes("ipad") || name.includes("tab") || name.includes("bảng")) {
    return DEFAULT_IMAGES.tablet[Math.floor(Math.random() * DEFAULT_IMAGES.tablet.length)];
  }
  if (name.includes("watch") || name.includes("đồng hồ")) {
    return DEFAULT_IMAGES.watch[Math.floor(Math.random() * DEFAULT_IMAGES.watch.length)];
  }
  if (name.includes("airpods") || name.includes("headphone") || name.includes("sony wh") || name.includes("logitech") || name.includes("chuột") || name.includes("tai nghe")) {
    return DEFAULT_IMAGES.accessory[Math.floor(Math.random() * DEFAULT_IMAGES.accessory.length)];
  }
  if (name.includes("màn hình") || name.includes("monitor") || name.includes("ultrasharp")) {
    return DEFAULT_IMAGES.monitor[Math.floor(Math.random() * DEFAULT_IMAGES.monitor.length)];
  }
  if (name.includes("wifi") || name.includes("router") || name.includes("archer") || name.includes("mạng")) {
    return DEFAULT_IMAGES.network[0];
  }
  if (name.includes("ps5") || name.includes("playstation") || name.includes("game") || name.includes("xbox")) {
    return DEFAULT_IMAGES.gaming[Math.floor(Math.random() * DEFAULT_IMAGES.gaming.length)];
  }
  return DEFAULT_IMAGES.laptop[0];
}

const NEW_PRODUCTS_DATA = [
  {
    name: "MacBook Pro 14 M3 Pro",
    sku: "MACBOOK-PRO-14-M3PRO",
    brandName: "Apple",
    categoryName: "Laptop",
    description: "MacBook Pro 14 inch trang bị vi xử lý Apple M3 Pro cực mạnh, màn hình Liquid Retina XDR 120Hz sắc nét, thời lượng pin lên đến 18 giờ liên tục. Phù hợp cho lập trình viên, nhà thiết kế đồ họa chuyên nghiệp và dựng phim 4K.",
    is_featured: true,
    variants: [
      {
        sku: "MACPRO14-M3-18-512-BLACK",
        variant_value: "18GB RAM - 512GB SSD - Đen Không Gian",
        price: 49990000,
        sale_price: 47990000,
        stock_quantity: 15,
        image: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=800&q=80",
        attributes_json: { RAM: "18GB", Storage: "512GB SSD", Color: "Space Black" },
      },
      {
        sku: "MACPRO14-M3-36-1TB-SILVER",
        variant_value: "36GB RAM - 1TB SSD - Bạc",
        price: 64990000,
        sale_price: 62990000,
        stock_quantity: 8,
        image: "https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?auto=format&fit=crop&w=800&q=80",
        attributes_json: { RAM: "36GB", Storage: "1TB SSD", Color: "Silver" },
      },
    ],
  },
  {
    name: "iPhone 16 Pro Max",
    sku: "IPHONE-16-PRO-MAX",
    brandName: "Apple",
    categoryName: "Điện thoại",
    description: "iPhone 16 Pro Max thế hệ mới trang bị khung Titan siêu nhẹ, chip Apple A18 Pro tiến trình 3nm, cụm camera tele zoom 5x quang học và nút Camera Control thông minh đột phá.",
    is_featured: true,
    variants: [
      {
        sku: "IP16PM-256-DESERT",
        variant_value: "256GB - Titan Sa Mạc",
        price: 34990000,
        sale_price: 33990000,
        stock_quantity: 25,
        image: "https://images.unsplash.com/photo-1592750475338-74b7b21085ab?auto=format&fit=crop&w=800&q=80",
        attributes_json: { Storage: "256GB", Color: "Desert Titanium" },
      },
      {
        sku: "IP16PM-512-NATURAL",
        variant_value: "512GB - Titan Tự Nhiên",
        price: 40990000,
        sale_price: 39990000,
        stock_quantity: 18,
        image: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=800&q=80",
        attributes_json: { Storage: "512GB", Color: "Natural Titanium" },
      },
    ],
  },
  {
    name: "Samsung Galaxy Z Fold6 5G",
    sku: "GALAXY-Z-FOLD6",
    brandName: "Samsung",
    categoryName: "Điện thoại",
    description: "Samsung Galaxy Z Fold6 đột phá công nghệ màn hình gập mỏng nhẹ hơn, trang bị Galaxy AI thông minh, chip Snapdragon 8 Gen 3 for Galaxy tối ưu hóa chơi game và đa nhiệm tuyệt đỉnh.",
    is_featured: true,
    variants: [
      {
        sku: "ZFOLD6-12-256-NAVY",
        variant_value: "12GB RAM - 256GB - Xám Nhàn",
        price: 43990000,
        sale_price: 41990000,
        stock_quantity: 10,
        image: "https://images.unsplash.com/photo-1580910051074-3eb694886505?auto=format&fit=crop&w=800&q=80",
        attributes_json: { RAM: "12GB", Storage: "256GB", Color: "Navy" },
      },
    ],
  },
  {
    name: "Asus ROG Ally X Gaming Handheld",
    sku: "ASUS-ROG-ALLY-X",
    brandName: "ASUS",
    categoryName: "Máy chơi game",
    description: "Máy chơi game cầm tay Asus ROG Ally X chạy Windows 11 mượt mà, chip AMD Ryzen Z1 Extreme, RAM 24GB LPDDR5X và viên pin 80Wh gấp đôi thế hệ trước. Thỏa sức chiến game AAA mọi lúc mọi nơi.",
    is_featured: true,
    variants: [
      {
        sku: "ROG-ALLY-X-24-1TB",
        variant_value: "24GB RAM - 1TB SSD - Đen",
        price: 24990000,
        sale_price: 23990000,
        stock_quantity: 15,
        image: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=800&q=80",
        attributes_json: { RAM: "24GB", Storage: "1TB SSD", Color: "Black" },
      },
    ],
  },
  {
    name: "Sony BDP-S6700 4K Upscaling Blu-ray Player",
    sku: "SONY-WH-1000XM5-SILVER",
    brandName: "Sony",
    categoryName: "Phụ kiện",
    description: "Tai nghe Bluetooth chống ồn đỉnh cao Sony WH-1000XM5 phiên bản màu Bạc sang trọng, micro lọc tiếng ồn chuẩn đàm thoại HD, thời lượng pin 30 giờ cùng công nghệ sạc nhanh 3 phút dùng 3 giờ.",
    is_featured: false,
    variants: [
      {
        sku: "WH1000XM5-SILVER",
        variant_value: "Màu Bạc - Chống ồn ANC",
        price: 8490000,
        sale_price: 7990000,
        stock_quantity: 20,
        image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80",
        attributes_json: { Color: "Silver", Feature: "ANC Active Noise Cancelling" },
      },
    ],
  },
  {
    name: "Apple Watch Ultra 2 GPS + Cellular",
    sku: "APPLE-WATCH-ULTRA-2",
    brandName: "Apple",
    categoryName: "Đồng hồ thông minh",
    description: "Đồng hồ thể thao chuyên nghiệp Apple Watch Ultra 2 vỏ Titan chống va đập tiêu chuẩn quân đội, màn hình sáng 3000 nits cao nhất lịch sử, tích hợp GPS tần số kép và đo độ sâu lặn 40m.",
    is_featured: true,
    variants: [
      {
        sku: "AW-ULTRA2-TRAIL-BLUE",
        variant_value: "49mm Vỏ Titan - Dây Trail Loop Xanh/Đen",
        price: 21990000,
        sale_price: 20990000,
        stock_quantity: 14,
        image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80",
        attributes_json: { Size: "49mm", Band: "Trail Loop", Material: "Titanium" },
      },
    ],
  },
  {
    name: "Dell Alienware 34 Curved QD-OLED Monitor",
    sku: "DELL-ALIENWARE-AW3423DWF",
    brandName: "Dell",
    categoryName: "Màn hình",
    description: "Màn hình cong gaming cao cấp Dell Alienware 34 inch chuẩn QD-OLED độ phân giải WQHD, tần số quét 165Hz, thời gian phản hồi siêu tốc 0.1ms và độ tương phản vô cực cho trải nghiệm hình ảnh tuyệt mỹ.",
    is_featured: true,
    variants: [
      {
        sku: "AW3423DWF-34-QDOLED",
        variant_value: "34 inch Curved QD-OLED 165Hz",
        price: 27990000,
        sale_price: 26490000,
        stock_quantity: 7,
        image: "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=800&q=80",
        attributes_json: { ScreenSize: "34 inch", RefreshRate: "165Hz", Panel: "QD-OLED" },
      },
    ],
  },
  {
    name: "iPad Pro 13 inch M4 Ultra Thin",
    sku: "IPAD-PRO-13-M4",
    brandName: "Apple",
    categoryName: "Máy tính bảng",
    description: "iPad Pro 13 inch 2024 trang bị chip Apple M4 sức mạnh vượt trội, màn hình Ultra Retina XDR công nghệ Tandem OLED sống động cùng độ mỏng kỉ lục chỉ 5.1mm mỏng nhất sản phẩm Apple.",
    is_featured: true,
    variants: [
      {
        sku: "IPADPRO13-M4-256-BLACK",
        variant_value: "256GB - Wifi - Đen Không Gian",
        price: 37990000,
        sale_price: 36490000,
        stock_quantity: 12,
        image: "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?auto=format&fit=crop&w=800&q=80",
        attributes_json: { Storage: "256GB", Connectivity: "Wifi", Color: "Space Black" },
      },
    ],
  },
  {
    name: "Xiaomi Mesh System AX3000 Wi-Fi 6",
    sku: "XIAOMI-MESH-AX3000",
    brandName: "Xiaomi",
    categoryName: "Thiết bị mạng",
    description: "Hệ thống Router Mesh Xiaomi AX3000 bộ 2 thiết bị phủ sóng toàn bộ ngôi nhà đến 370m2, tốc độ Wi-Fi 6 siêu tốc 3000Mbps, kết nối đồng thời hơn 254 thiết bị thông minh ổn định.",
    is_featured: false,
    variants: [
      {
        sku: "AX3000-2PACK-WHITE",
        variant_value: "Bộ 2 Thiết Bị Mesh - Màu Trắng",
        price: 2490000,
        sale_price: 2190000,
        stock_quantity: 35,
        image: "https://images.unsplash.com/photo-1544197150-b99a580bb7a8?auto=format&fit=crop&w=800&q=80",
        attributes_json: { Speed: "3000Mbps", Coverage: "370m2", Pack: "2 Units" },
      },
    ],
  },
  {
    name: "Logitech G Pro X Superlight 2 Wireless Gaming Mouse",
    sku: "LOGITECH-GPROX-SUPERLIGHT-2",
    brandName: "Logitech",
    categoryName: "Phụ kiện",
    description: "Chuột chơi game không dây siêu nhẹ Logitech G Pro X Superlight 2 trọng lượng chỉ 60g, trang bị mắt đọc HERO 2 cảm biến 32.000 DPI, Switch lai Quang-Cơ LIGHTFORCE cực bền cho Esport chuyên nghiệp.",
    is_featured: true,
    variants: [
      {
        sku: "GPROX-SL2-WHITE",
        variant_value: "Màu Trắng - 60g - 32.000 DPI",
        price: 3890000,
        sale_price: 3590000,
        stock_quantity: 40,
        image: "https://images.unsplash.com/photo-1608156639585-34a0a56ee6c9?auto=format&fit=crop&w=800&q=80",
        attributes_json: { Weight: "60g", Sensor: "HERO 2 32K", Color: "White" },
      },
    ],
  },
];

async function seedAndFixProducts() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB database:", MONGO_URI);

    // Fetch existing Categories & Brands lookup map
    const categories = await Category.find();
    const brands = await Brand.find();

    const categoryMap = {};
    categories.forEach((cat) => {
      categoryMap[cat.name.toLowerCase()] = cat._id;
    });

    const brandMap = {};
    brands.forEach((b) => {
      brandMap[b.name.toLowerCase()] = b._id;
    });

    console.log("\n--- STEP 1: FIXING EXISTING PRODUCTS (MISSING IMAGES & DESCRIPTIONS) ---");
    const allProducts = await Product.find().populate("category_id");
    let fixedProdCount = 0;
    let fixedVarCount = 0;

    for (const prod of allProducts) {
      let updatedProd = false;
      const catName = prod.category_id?.name || "Công nghệ";

      // Fix missing product description
      if (!prod.description || prod.description.trim().length < 5) {
        prod.description = `${prod.name} chính hãng công nghệ cao, hiệu năng vượt trội, kiểu dáng hiện đại phù hợp cho công việc và giải trí hằng ngày. Bảo hành chính hãng 12 tháng.`;
        updatedProd = true;
      }

      if (updatedProd) {
        await prod.save();
        fixedProdCount++;
      }

      // Check product variants for missing images
      const variants = await ProductVariant.find({ product_id: prod._id });
      for (const variant of variants) {
        let updatedVar = false;
        if (!variant.image || variant.image.includes("demo/image") || variant.image.trim() === "") {
          variant.image = getFallbackImage(prod.name, catName);
          updatedVar = true;
        }

        if (updatedVar) {
          await variant.save();
          fixedVarCount++;
        }
      }
    }
    console.log(`✅ Fixed descriptions for ${fixedProdCount} products.`);
    console.log(`✅ Fixed/Added images for ${fixedVarCount} product variants.`);

    console.log("\n--- STEP 2: AUTOMATICALLY ADDING NEW RICH PRODUCTS ---");
    let addedCount = 0;

    for (const item of NEW_PRODUCTS_DATA) {
      // Find matching category & brand ID
      let categoryId = categoryMap[item.categoryName.toLowerCase()] || categories[0]?._id;
      let brandId = brandMap[item.brandName.toLowerCase()] || brands[0]?._id;

      // Check if product SKU or Name already exists
      let existingProd = await Product.findOne({
        $or: [{ sku: item.sku }, { name: item.name }],
      });

      if (!existingProd) {
        existingProd = await Product.create({
          name: item.name,
          sku: item.sku,
          brand_id: brandId,
          category_id: categoryId,
          description: item.description,
          is_featured: item.is_featured,
          status: "active",
          average_rating: (4.5 + Math.random() * 0.5).toFixed(1),
          rating_count: Math.floor(Math.random() * 15) + 3,
          total_review: Math.floor(Math.random() * 15) + 3,
        });

        // Add variants for this new product
        for (const varData of item.variants) {
          await ProductVariant.create({
            product_id: existingProd._id,
            sku: varData.sku,
            variant_value: varData.variant_value,
            price: varData.price,
            sale_price: varData.sale_price,
            stock_quantity: varData.stock_quantity,
            image: varData.image,
            attributes_json: varData.attributes_json,
            is_active: true,
          });
        }
        addedCount++;
        console.log(`+ Added product: ${item.name} (${item.variants.length} variants)`);
      } else {
        console.log(`~ Product already exists: ${item.name}`);
      }
    }

    console.log(`\n🎉 SEED COMPLETED! Added ${addedCount} new products with full images & detailed descriptions.`);

    process.exit(0);
  } catch (error) {
    console.error("Error seeding products:", error);
    process.exit(1);
  }
}

seedAndFixProducts();
