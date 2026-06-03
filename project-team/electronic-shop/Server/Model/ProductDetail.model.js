const mongoose = require("mongoose");

const productDetailSchema = new mongoose.Schema(
    {
        chip: { type: String, required: true, minlength: 1, maxlength: 30 },
        memory: { type: Number, required: true, minlength: 1, maxlength: 50 },
        RAM: { type: Number, required: true, minlength: 1, maxlength: 50 },
        SIM: { type: Number, required: true, minlength: 1, maxlength: 30 },
        screen_size: { type: String, required: true, minlength: 1, maxlength: 50 },
        color: { type: String, required: true, minlength: 1, maxlength: 50 },
        // product_id: { type: mongoose.Schema.Types.ObjectId, required: true, unique: true, ref: 'Product'},
        
    },
    { timestamps: true }
);

const ProductDetail = mongoose.model('ProductDetail', productDetailSchema)

module.exports = ProductDetail;