const mongoose = require("mongoose");

const brandSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, minlength: 1, maxlength: 30 },
        img_url: { type: String, required: true, minlength: 1, maxlength: 50 },   
    },
    { timestamps: true }
);

const Brand = mongoose.model('Brand', brandSchema)

module.exports = Brand;