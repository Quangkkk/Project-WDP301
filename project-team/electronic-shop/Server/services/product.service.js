const Product = require("../models/Product.model");
const ProductVariant = require("../models/ProductVariant.model");
const Brand = require("../models/Brand.model");
const Category = require("../models/Category.model");

// Helpers de build variants
const pickVariantValue = (body) => body.variant_value || body.variant_name || body.name || body.value;
const pickVariantImage = (body) => {
  if (body.image !== undefined) return body.image;
  if (Array.isArray(body.images)) return body.images[0] || null;
  return body.images || null;
};

const buildVariantPayload = (body, productId) => ({
  product_id: productId || body.product_id,
  sku: body.sku,
  variant_value: pickVariantValue(body),
  price: body.price,
  image: pickVariantImage(body),
  attributes_json: body.attributes_json || {},
  weight: body.weight ?? null,
  sale_price: body.sale_price ?? 0,
  stock_quantity: body.stock_quantity ?? 0,
  is_active: body.is_active !== undefined ? body.is_active : body.status ? body.status === "active" : true,
});

// Tao san pham moi va cac variant kem theo
const createProduct = async (productData) => {
  const {
    brand_id,
    category_id,
    name,
    sku,
    description,
    total_review,
    average_rating,
    rating_count,
    status,
    is_featured,
    variants,
  } = productData;

  if (!brand_id || !category_id || !name || !sku) {
    throw new Error("brand_id, category_id, name and sku are required");
  }

  const [brand, category] = await Promise.all([
    Brand.findById(brand_id),
    Category.findById(category_id),
  ]);
  if (!brand) throw new Error("Brand not found");
  if (!category) throw new Error("Category not found");

  const existedSku = await Product.findOne({ sku: String(sku).toUpperCase().trim() });
  if (existedSku) throw new Error("Product SKU already exists");

  const product = await Product.create({
    brand_id,
    category_id,
    name,
    sku,
    description: description || null,
    total_review: total_review ?? 0,
    average_rating: average_rating ?? 0,
    rating_count: rating_count ?? 0,
    status: status || "active",
    is_featured: Boolean(is_featured),
  });

  let createdVariants = [];
  if (Array.isArray(variants) && variants.length > 0) {
    const payload = variants.map((variant) => {
      const variantPayload = buildVariantPayload(variant, product._id);
      if (!variantPayload.sku || !variantPayload.variant_value || variantPayload.price === undefined) {
        throw new Error("Each variant must have sku, variant_value and price");
      }
      return variantPayload;
    });
    createdVariants = await ProductVariant.insertMany(payload);
  }

  return { product, variants: createdVariants };
};

// Lay danh sach san pham co phan trang, tim kiem, loc theo brand, category va khoang gia
const getAllProducts = async (queryParams) => {
  const {
    category_id,
    brand_id,
    status,
    featured,
    q,
    min_price,
    max_price,
    page = 1,
    limit = 10,
  } = queryParams;

  const filter = {};
  if (category_id) filter.category_id = category_id;
  if (brand_id) filter.brand_id = brand_id;
  if (status) filter.status = status;
  if (featured !== undefined) {
    filter.is_featured = featured === "true" || featured === true;
  }

  if (q) {
    filter.$or = [
      { name: new RegExp(q, "i") },
      { sku: new RegExp(q, "i") },
    ];
  }

  // Loc theo khoang gia bang cach truy van collection ProductVariant
  if (min_price !== undefined || max_price !== undefined) {
    const variantFilter = { is_active: true };
    const priceConditions = [];
    const salePriceConditions = [];

    const minVal = min_price !== undefined ? Number(min_price) : null;
    const maxVal = max_price !== undefined ? Number(max_price) : null;

    if (minVal !== null) {
      priceConditions.push({ price: { $gte: minVal } });
      salePriceConditions.push({ sale_price: { $gte: minVal } });
    }
    if (maxVal !== null) {
      priceConditions.push({ price: { $lte: maxVal } });
      salePriceConditions.push({ sale_price: { $lte: maxVal } });
    }

    const orConditions = [];
    if (priceConditions.length > 0) {
      // sale_price khong ton tai hoac bang 0 -> so sanh price
      orConditions.push({
        $and: [
          { $or: [{ sale_price: { $exists: false } }, { sale_price: 0 }, { sale_price: null }] },
          ...priceConditions,
        ],
      });
    }
    if (salePriceConditions.length > 0) {
      // sale_price > 0 -> so sanh sale_price
      orConditions.push({
        $and: [
          { sale_price: { $gt: 0 } },
          ...salePriceConditions,
        ],
      });
    }

    if (orConditions.length > 0) {
      variantFilter.$or = orConditions;
    }

    const matchingVariants = await ProductVariant.find(variantFilter).select("product_id").lean();
    const productIds = matchingVariants.map((v) => v.product_id);
    filter._id = { $in: productIds };
  }

  const pageNum = Math.max(1, Number(page));
  const limitNum = Math.max(1, Number(limit));
  const skip = (pageNum - 1) * limitNum;

  const total = await Product.countDocuments(filter);
  const products = await Product.find(filter)
    .populate("brand_id", "name logo_img status")
    .populate("category_id", "name status")
    .select("-__v")
    .sort({ created_at: -1 })
    .skip(skip)
    .limit(limitNum)
    .lean();

  const productIds = products.map((product) => product._id);
  const variants = await ProductVariant.find({ product_id: { $in: productIds }, is_active: true })
    .select("-__v")
    .lean();

  const variantsByProduct = variants.reduce((acc, variant) => {
    const key = String(variant.product_id);
    if (!acc[key]) acc[key] = [];
    acc[key].push(variant);
    return acc;
  }, {});

  const data = products.map((product) => ({
    ...product,
    variants: variantsByProduct[String(product._id)] || [],
  }));

  return {
    total,
    page: pageNum,
    limit: limitNum,
    totalPages: Math.ceil(total / limitNum),
    data,
  };
};

// Lay chi tiet san pham va tat ca variants
const getProductById = async (id) => {
  const product = await Product.findById(id)
    .populate("brand_id", "name logo_img status")
    .populate("category_id", "name status")
    .select("-__v");

  if (!product) {
    throw new Error("Product not found");
  }

  const variants = await ProductVariant.find({ product_id: id }).select("-__v").sort({ created_at: -1 });
  return { product, variants };
};

// Cap nhat san pham
const updateProductById = async (id, updateFields) => {
  const allowedFields = [
    "brand_id",
    "category_id",
    "name",
    "sku",
    "description",
    "total_review",
    "average_rating",
    "rating_count",
    "status",
    "is_featured",
  ];

  const updateData = {};
  for (const field of allowedFields) {
    if (updateFields[field] !== undefined) updateData[field] = updateFields[field];
  }

  if (updateData.brand_id) {
    const brand = await Brand.findById(updateData.brand_id);
    if (!brand) throw new Error("Brand not found");
  }
  if (updateData.category_id) {
    const category = await Category.findById(updateData.category_id);
    if (!category) throw new Error("Category not found");
  }

  if (Object.keys(updateData).length === 0) {
    throw new Error("No data to update");
  }

  const data = await Product.findByIdAndUpdate(id, updateData, { new: true, runValidators: true })
    .populate("brand_id", "name logo_img status")
    .populate("category_id", "name status")
    .select("-__v");

  if (!data) {
    throw new Error("Product not found");
  }

  return data;
};

// Xoa san pham va cac variants cua no
const deleteProductById = async (id) => {
  const data = await Product.findByIdAndDelete(id).select("-__v");
  if (!data) {
    throw new Error("Product not found");
  }

  await ProductVariant.deleteMany({ product_id: id });
  return data;
};

// Tao variant moi
const createVariant = async (productId, variantData) => {
  const product = await Product.findById(productId);
  if (!product) {
    throw new Error("Product not found");
  }

  const payload = buildVariantPayload(variantData, productId);
  if (!payload.sku || !payload.variant_value || payload.price === undefined) {
    throw new Error("sku, variant_value and price are required");
  }

  return await ProductVariant.create(payload);
};

// Cap nhat variant
const updateVariant = async (variantId, variantData) => {
  const allowedFields = [
    "product_id",
    "sku",
    "variant_value",
    "price",
    "image",
    "attributes_json",
    "weight",
    "sale_price",
    "stock_quantity",
    "is_active",
  ];
  const updateData = {};

  for (const field of allowedFields) {
    if (variantData[field] !== undefined) updateData[field] = variantData[field];
  }
  if (variantData.variant_name !== undefined && updateData.variant_value === undefined) {
    updateData.variant_value = variantData.variant_name;
  }
  if (variantData.images !== undefined && updateData.image === undefined) {
    updateData.image = Array.isArray(variantData.images)
      ? variantData.images[0] || null
      : variantData.images;
  }
  if (variantData.status !== undefined && updateData.is_active === undefined) {
    updateData.is_active = variantData.status === "active";
  }

  if (Object.keys(updateData).length === 0) {
    throw new Error("No data to update");
  }

  const data = await ProductVariant.findByIdAndUpdate(variantId, updateData, { new: true, runValidators: true }).select("-__v");
  if (!data) {
    throw new Error("Product variant not found");
  }

  return data;
};

// Xoa variant
const deleteVariant = async (variantId) => {
  const data = await ProductVariant.findByIdAndDelete(variantId).select("-__v");
  if (!data) {
    throw new Error("Product variant not found");
  }
  return data;
};

module.exports = {
  createProduct,
  getAllProducts,
  getProductById,
  updateProductById,
  deleteProductById,
  createVariant,
  updateVariant,
  deleteVariant,
};
