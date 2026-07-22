const Product = require("../models/Product.model");
const ProductVariant = require("../models/ProductVariant.model");
const Brand = require("../models/Brand.model");
const Category = require("../models/Category.model");

const escapeRegex = (value) =>
  String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const parseLocalizedNumber = (value) => {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return Number.NaN;
  }

  return Number(
    String(value)
      .trim()
      .replace(/\s+/g, "")
      .replace(",", ".")
  );
};

const parseOptionalLocalizedNumber = (value) => {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  return parseLocalizedNumber(value);
};

const pickVariantValue = (body) =>
  body.variant_value ||
  body.variant_name ||
  body.name ||
  body.value;

const pickVariantImage = (body) => {
  if (body.image !== undefined) {
    return body.image;
  }

  if (Array.isArray(body.images)) {
    return body.images[0] || null;
  }

  return body.images || null;
};

const buildVariantPayload = (
  body,
  productId
) => ({
  product_id:
    productId ||
    body.product_id,

  sku: body.sku,

  variant_value:
    pickVariantValue(body),

  price:
    parseLocalizedNumber(
      body.price
    ),

  image:
    pickVariantImage(body),

  attributes_json:
    body.attributes_json || {},

  weight:
    parseOptionalLocalizedNumber(
      body.weight
    ),

  sale_price:
    body.sale_price === null ||
    body.sale_price === undefined ||
    body.sale_price === ""
      ? 0
      : parseLocalizedNumber(
          body.sale_price
        ),

  stock_quantity:
    body.stock_quantity === null ||
    body.stock_quantity === undefined ||
    body.stock_quantity === ""
      ? 0
      : Number(
          body.stock_quantity
        ),

  is_active:
    body.is_active !== undefined
      ? body.is_active
      : body.status
        ? body.status === "active"
        : true,
});

const normalizeVariantSku = (
  sku
) =>
  String(sku || "")
    .trim()
    .toUpperCase();

const validateVariantPayloads =
  async (
    variants,
    {
      excludeVariantIds = [],
    } = {}
  ) => {
    if (
      !Array.isArray(variants) ||
      variants.length === 0
    ) {
      throw new Error(
        "Sản phẩm phải có ít nhất một phiên bản"
      );
    }

    const normalizedSkus = [];

    for (
      const [
        index,
        variant,
      ] of variants.entries()
    ) {
      if (
        !variant.sku ||
        !variant.variant_value ||
        variant.price === undefined
      ) {
        throw new Error(
          `Phiên bản ${
            index + 1
          } phải có SKU, tên phiên bản và giá bán`
        );
      }

      const normalizedSku =
        normalizeVariantSku(
          variant.sku
        );

      if (!normalizedSku) {
        throw new Error(
          `SKU phiên bản ${
            index + 1
          } không hợp lệ`
        );
      }

      const price =
        parseLocalizedNumber(
          variant.price
        );

      const salePrice =
        parseLocalizedNumber(
          variant.sale_price || 0
        );

      const stockQuantity =
        Number(
          variant.stock_quantity || 0
        );

      const weight =
        variant.weight === null ||
        variant.weight ===
          undefined ||
        variant.weight === ""
          ? null
          : parseLocalizedNumber(
              variant.weight
            );

      if (
        !Number.isFinite(price) ||
        price < 0
      ) {
        throw new Error(
          `Giá bán của phiên bản ${
            index + 1
          } không hợp lệ`
        );
      }

      if (
        !Number.isFinite(
          salePrice
        ) ||
        salePrice < 0
      ) {
        throw new Error(
          `Giá khuyến mãi của phiên bản ${
            index + 1
          } không hợp lệ`
        );
      }

      if (
        salePrice > 0 &&
        salePrice > price
      ) {
        throw new Error(
          `Giá khuyến mãi của phiên bản ${
            index + 1
          } không được lớn hơn giá gốc`
        );
      }

      if (
        !Number.isInteger(
          stockQuantity
        ) ||
        stockQuantity < 0
      ) {
        throw new Error(
          `Tồn kho của phiên bản ${
            index + 1
          } không hợp lệ`
        );
      }

      if (
        weight !== null &&
        (
          !Number.isFinite(
            weight
          ) ||
          weight < 0
        )
      ) {
        throw new Error(
          `Khối lượng của phiên bản ${
            index + 1
          } không hợp lệ`
        );
      }

      normalizedSkus.push(
        normalizedSku
      );
    }

    if (
      new Set(
        normalizedSkus
      ).size !==
      normalizedSkus.length
    ) {
      throw new Error(
        "SKU phiên bản không được trùng nhau trong cùng sản phẩm"
      );
    }

    const duplicateFilter = {
      sku: {
        $in: normalizedSkus,
      },
    };

    if (
      excludeVariantIds.length >
      0
    ) {
      duplicateFilter._id = {
        $nin:
          excludeVariantIds,
      };
    }

    const duplicatedVariant =
      await ProductVariant.findOne(
        duplicateFilter
      )
        .select("sku")
        .lean();

    if (
      duplicatedVariant
    ) {
      throw new Error(
        `SKU phiên bản ${duplicatedVariant.sku} đã tồn tại`
      );
    }
  };

const createProduct = async (
  productData
) => {
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

  if (
    !brand_id ||
    !category_id ||
    !name ||
    !sku
  ) {
    throw new Error(
      "Vui lòng nhập đầy đủ thương hiệu, danh mục, tên và SKU sản phẩm"
    );
  }

  const [
    brand,
    category,
  ] = await Promise.all([
    Brand.findById(
      brand_id
    ),
    Category.findById(
      category_id
    ),
  ]);

  if (!brand) {
    throw new Error(
      "Không tìm thấy thương hiệu"
    );
  }

  if (!category) {
    throw new Error(
      "Không tìm thấy danh mục"
    );
  }

  const existedSku =
    await Product.findOne({
      sku: String(sku)
        .toUpperCase()
        .trim(),
    });

  if (existedSku) {
    throw new Error(
      "SKU sản phẩm đã tồn tại"
    );
  }

  const variantPayloads = (
    Array.isArray(variants)
      ? variants
      : []
  ).map((variant) => ({
    ...buildVariantPayload(
      variant
    ),

    sku: normalizeVariantSku(
      variant.sku
    ),
  }));

  await validateVariantPayloads(
    variantPayloads
  );

  const product =
    await Product.create({
      brand_id,
      category_id,
      name,

      sku: String(sku)
        .trim()
        .toUpperCase(),

      description:
        description || null,

      total_review:
        total_review ?? 0,

      average_rating:
        average_rating ?? 0,

      rating_count:
        rating_count ?? 0,

      status:
        status || "active",

      is_featured:
        Boolean(
          is_featured
        ),
    });

  let createdVariants = [];

  try {
    createdVariants =
      await ProductVariant.insertMany(
        variantPayloads.map(
          (variant) => ({
            ...variant,
            product_id:
              product._id,
          })
        )
      );
  } catch (error) {
    await Product.findByIdAndDelete(
      product._id
    );

    throw error;
  }

  return {
    product,
    variants:
      createdVariants,
  };
};

const getAllProducts = async (
  queryParams
) => {
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

  if (category_id) {
    filter.category_id =
      category_id;
  }

  if (brand_id) {
    filter.brand_id =
      brand_id;
  }

  if (status) {
    filter.status =
      status;
  }

  if (
    featured !== undefined
  ) {
    filter.is_featured =
      featured === "true" ||
      featured === true;
  }

  if (q) {
    const keyword =
      escapeRegex(q);

    filter.$or = [
      {
        name: new RegExp(
          keyword,
          "i"
        ),
      },
      {
        sku: new RegExp(
          keyword,
          "i"
        ),
      },
    ];
  }

  if (
    min_price !==
      undefined ||
    max_price !==
      undefined
  ) {
    const variantFilter = {
      is_active: true,
    };

    const priceConditions =
      [];

    const salePriceConditions =
      [];

    const minVal =
      min_price !==
      undefined
        ? Number(min_price)
        : null;

    const maxVal =
      max_price !==
      undefined
        ? Number(max_price)
        : null;

    if (minVal !== null) {
      priceConditions.push({
        price: {
          $gte: minVal,
        },
      });

      salePriceConditions.push({
        sale_price: {
          $gte: minVal,
        },
      });
    }

    if (maxVal !== null) {
      priceConditions.push({
        price: {
          $lte: maxVal,
        },
      });

      salePriceConditions.push({
        sale_price: {
          $lte: maxVal,
        },
      });
    }

    const orConditions = [];

    if (
      priceConditions.length >
      0
    ) {
      orConditions.push({
        $and: [
          {
            $or: [
              {
                sale_price: {
                  $exists:
                    false,
                },
              },
              {
                sale_price: 0,
              },
              {
                sale_price:
                  null,
              },
            ],
          },
          ...priceConditions,
        ],
      });
    }

    if (
      salePriceConditions.length >
      0
    ) {
      orConditions.push({
        $and: [
          {
            sale_price: {
              $gt: 0,
            },
          },
          ...salePriceConditions,
        ],
      });
    }

    if (
      orConditions.length >
      0
    ) {
      variantFilter.$or =
        orConditions;
    }

    const matchingVariants =
      await ProductVariant.find(
        variantFilter
      )
        .select(
          "product_id"
        )
        .lean();

    const productIds =
      matchingVariants.map(
        (variant) =>
          variant.product_id
      );

    filter._id = {
      $in: productIds,
    };
  }

  const pageNum =
    Math.max(
      1,
      Number(page)
    );

  const limitNum =
    Math.max(
      1,
      Number(limit)
    );

  const skip =
    (pageNum - 1) *
    limitNum;

  const total =
    await Product.countDocuments(
      filter
    );

  const products =
    await Product.find(
      filter
    )
      .populate(
        "brand_id",
        "name logo_img status"
      )
      .populate(
        "category_id",
        "name status"
      )
      .select("-__v")
      .sort({
        created_at: -1,
      })
      .skip(skip)
      .limit(limitNum)
      .lean();

  const productIds =
    products.map(
      (product) =>
        product._id
    );

  const variants =
    await ProductVariant.find({
      product_id: {
        $in: productIds,
      },
      is_active: true,
    })
      .select("-__v")
      .lean();

  const variantsByProduct =
    variants.reduce(
      (
        result,
        variant
      ) => {
        const key =
          String(
            variant.product_id
          );

        if (!result[key]) {
          result[key] = [];
        }

        result[key].push(
          variant
        );

        return result;
      },
      {}
    );

  const data =
    products.map(
      (product) => ({
        ...product,

        variants:
          variantsByProduct[
            String(
              product._id
            )
          ] || [],
      })
    );

  return {
    total,
    page: pageNum,
    limit: limitNum,

    totalPages:
      Math.ceil(
        total /
          limitNum
      ),

    data,
  };
};

const getProductById =
  async (id) => {
    const product =
      await Product.findById(
        id
      )
        .populate(
          "brand_id",
          "name logo_img status"
        )
        .populate(
          "category_id",
          "name status"
        )
        .select("-__v");

    if (!product) {
      throw new Error(
        "Không tìm thấy sản phẩm"
      );
    }

    const variants =
      await ProductVariant.find({
        product_id: id,
      })
        .select("-__v")
        .sort({
          created_at: -1,
        });

    return {
      product,
      variants,
    };
  };

const updateProductById =
  async (
    id,
    updateFields
  ) => {
    const product =
      await Product.findById(
        id
      ).lean();

    if (!product) {
      throw new Error(
        "Không tìm thấy sản phẩm"
      );
    }

    const allowedFields = [
      "brand_id",
      "category_id",
      "name",
      "sku",
      "description",
      "status",
      "is_featured",
    ];

    const updateData = {};

    for (
      const field of
      allowedFields
    ) {
      if (
        updateFields[
          field
        ] !== undefined
      ) {
        updateData[field] =
          updateFields[field];
      }
    }

    if (
      updateData.brand_id
    ) {
      const brand =
        await Brand.findById(
          updateData.brand_id
        );

      if (!brand) {
        throw new Error(
          "Không tìm thấy thương hiệu"
        );
      }
    }

    if (
      updateData.category_id
    ) {
      const category =
        await Category.findById(
          updateData.category_id
        );

      if (!category) {
        throw new Error(
          "Không tìm thấy danh mục"
        );
      }
    }

    if (
      updateData.name !==
      undefined
    ) {
      updateData.name =
        String(
          updateData.name ||
            ""
        ).trim();

      if (!updateData.name) {
        throw new Error(
          "Tên sản phẩm không được để trống"
        );
      }
    }

    if (
      updateData.sku !==
      undefined
    ) {
      updateData.sku =
        String(
          updateData.sku ||
            ""
        )
          .trim()
          .toUpperCase();

      if (!updateData.sku) {
        throw new Error(
          "SKU sản phẩm không được để trống"
        );
      }

      const duplicatedProduct =
        await Product.findOne({
          _id: {
            $ne: id,
          },
          sku:
            updateData.sku,
        })
          .select("_id")
          .lean();

      if (
        duplicatedProduct
      ) {
        throw new Error(
          "SKU sản phẩm đã tồn tại"
        );
      }
    }

    if (
      updateData.description !==
      undefined
    ) {
      const description =
        String(
          updateData.description ||
            ""
        ).trim();

      updateData.description =
        description || null;
    }

    if (
      updateData.status !==
      undefined
    ) {
      const allowedStatuses =
        [
          "active",
          "inactive",
          "out_of_stock",
        ];

      if (
        !allowedStatuses.includes(
          updateData.status
        )
      ) {
        throw new Error(
          "Trạng thái sản phẩm không hợp lệ"
        );
      }
    }

    if (
      updateData.is_featured !==
      undefined
    ) {
      updateData.is_featured =
        Boolean(
          updateData.is_featured
        );
    }

    const hasVariants =
      Array.isArray(
        updateFields.variants
      );

    if (
      !hasVariants &&
      Object.keys(
        updateData
      ).length === 0
    ) {
      throw new Error(
        "Không có dữ liệu để cập nhật"
      );
    }

    let normalizedVariants =
      null;

    let existingVariants =
      [];

    if (hasVariants) {
      if (
        updateFields
          .variants
          .length === 0
      ) {
        throw new Error(
          "Sản phẩm phải có ít nhất một phiên bản"
        );
      }

      existingVariants =
        await ProductVariant.find({
          product_id: id,
        }).lean();

      const existingById =
        new Map(
          existingVariants.map(
            (variant) => [
              String(
                variant._id
              ),
              variant,
            ]
          )
        );

      normalizedVariants =
        updateFields.variants.map(
          (
            variant,
            index
          ) => {
            const variantId =
              String(
                variant?._id ||
                  variant?.id ||
                  ""
              ).trim();

            const currentVariant =
              variantId
                ? existingById.get(
                    variantId
                  )
                : null;

            if (
              variantId &&
              !currentVariant
            ) {
              throw new Error(
                `Phiên bản ${
                  index + 1
                } không thuộc sản phẩm đang cập nhật`
              );
            }

            const mergedVariant =
              {
                ...(
                  currentVariant ||
                  {}
                ),
                ...variant,
                product_id: id,
              };

            const payload = {
              ...buildVariantPayload(
                mergedVariant,
                id
              ),

              sku:
                normalizeVariantSku(
                  mergedVariant.sku
                ),
            };

            return {
              _id:
                variantId ||
                null,

              payload,
            };
          }
        );

      await validateVariantPayloads(
        normalizedVariants.map(
          (item) =>
            item.payload
        ),
        {
          excludeVariantIds:
            normalizedVariants
              .filter(
                (item) =>
                  item._id
              )
              .map(
                (item) =>
                  item._id
              ),
        }
      );
    }

    if (
      Object.keys(
        updateData
      ).length > 0
    ) {
      await Product.findByIdAndUpdate(
        id,
        updateData,
        {
          returnDocument:
            "after",

          runValidators:
            true,
        }
      );
    }

    if (
      normalizedVariants
    ) {
      const submittedExistingIds =
        normalizedVariants
          .filter(
            (item) =>
              item._id
          )
          .map(
            (item) =>
              item._id
          );

      const removedVariantIds =
        existingVariants
          .map(
            (variant) =>
              String(
                variant._id
              )
          )
          .filter(
            (variantId) =>
              !submittedExistingIds.includes(
                variantId
              )
          );

      const operations =
        normalizedVariants.map(
          (item) => {
            if (item._id) {
              return {
                updateOne: {
                  filter: {
                    _id:
                      item._id,

                    product_id:
                      id,
                  },

                  update: {
                    $set:
                      item.payload,
                  },
                },
              };
            }

            return {
              insertOne: {
                document:
                  item.payload,
              },
            };
          }
        );

      if (
        operations.length >
        0
      ) {
        await ProductVariant.bulkWrite(
          operations,
          {
            ordered: true,
          }
        );
      }

      if (
        removedVariantIds.length >
        0
      ) {
        await ProductVariant.deleteMany(
          {
            _id: {
              $in:
                removedVariantIds,
            },

            product_id: id,
          }
        );
      }
    }

    return await getProductById(
      id
    );
  };

const deleteProductById =
  async (id) => {
    const data =
      await Product.findByIdAndDelete(
        id
      ).select("-__v");

    if (!data) {
      throw new Error(
        "Không tìm thấy sản phẩm"
      );
    }

    await ProductVariant.deleteMany(
      {
        product_id: id,
      }
    );

    return data;
  };

const createVariant = async (
  productId,
  variantData
) => {
  const product =
    await Product.findById(
      productId
    );

  if (!product) {
    throw new Error(
      "Không tìm thấy sản phẩm"
    );
  }

  const payload = {
    ...buildVariantPayload(
      variantData,
      productId
    ),

    sku:
      normalizeVariantSku(
        variantData.sku
      ),
  };

  if (
    !payload.sku ||
    !payload.variant_value ||
    payload.price ===
      undefined
  ) {
    throw new Error(
      "Vui lòng nhập SKU, tên phiên bản và giá bán"
    );
  }

  await validateVariantPayloads(
    [payload]
  );

  return await ProductVariant.create(
    payload
  );
};

const updateVariant = async (
  variantId,
  variantData
) => {
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

  for (
    const field of
    allowedFields
  ) {
    if (
      variantData[
        field
      ] !== undefined
    ) {
      updateData[field] =
        variantData[field];
    }
  }

  if (
    updateData.sku !==
    undefined
  ) {
    updateData.sku =
      normalizeVariantSku(
        updateData.sku
      );
  }

  if (
    updateData.price !==
    undefined
  ) {
    updateData.price =
      parseLocalizedNumber(
        updateData.price
      );
  }

  if (
    updateData.sale_price !==
    undefined
  ) {
    updateData.sale_price =
      updateData.sale_price ===
        null ||
      updateData.sale_price ===
        ""
        ? 0
        : parseLocalizedNumber(
            updateData.sale_price
          );
  }

  if (
    updateData.stock_quantity !==
    undefined
  ) {
    updateData.stock_quantity =
      Number(
        updateData.stock_quantity
      );
  }

  if (
    updateData.weight !==
    undefined
  ) {
    updateData.weight =
      parseOptionalLocalizedNumber(
        updateData.weight
      );
  }

  if (
    variantData.variant_name !==
      undefined &&
    updateData.variant_value ===
      undefined
  ) {
    updateData.variant_value =
      variantData.variant_name;
  }

  if (
    variantData.images !==
      undefined &&
    updateData.image ===
      undefined
  ) {
    updateData.image =
      Array.isArray(
        variantData.images
      )
        ? variantData
            .images[0] ||
          null
        : variantData.images;
  }

  if (
    variantData.status !==
      undefined &&
    updateData.is_active ===
      undefined
  ) {
    updateData.is_active =
      variantData.status ===
      "active";
  }

  if (
    Object.keys(
      updateData
    ).length === 0
  ) {
    throw new Error(
      "Không có dữ liệu để cập nhật"
    );
  }

  const currentVariant =
    await ProductVariant.findById(
      variantId
    ).lean();

  if (!currentVariant) {
    throw new Error(
      "Không tìm thấy phiên bản sản phẩm"
    );
  }

  const payloadForValidation =
    {
      ...currentVariant,
      ...updateData,
    };

  await validateVariantPayloads(
    [
      payloadForValidation,
    ],
    {
      excludeVariantIds:
        [variantId],
    }
  );

  const data =
    await ProductVariant.findByIdAndUpdate(
      variantId,
      updateData,
      {
        returnDocument:
          "after",

        runValidators:
          true,
      }
    ).select("-__v");

  if (!data) {
    throw new Error(
      "Không tìm thấy phiên bản sản phẩm"
    );
  }

  return data;
};

const deleteVariant = async (
  variantId
) => {
  const data =
    await ProductVariant.findByIdAndDelete(
      variantId
    ).select("-__v");

  if (!data) {
    throw new Error(
      "Không tìm thấy phiên bản sản phẩm"
    );
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