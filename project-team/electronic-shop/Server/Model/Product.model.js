const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
    {
        
        name: { type: String, required: true, minlength: 1, maxlength: 30 },
        img_url: { type: String, required: true, minlength: 1, maxlength: 50 },
        description: { type: String, required: true, minlength: 1, maxlength: 50 },
        price: { type: Number, required: true, default: 1 },
        product_detail_id: { type: mongoose.Schema.Types.ObjectId, unique: true, required: false, ref: 'ProductDetail'},
        brand_id: { type: mongoose.Schema.Types.ObjectId, required: false, ref: 'Brand'},
        category_id: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Category'},

    },
    { timestamps: true }
);

const Product = mongoose.model('Product', productSchema)

module.exports = Product;