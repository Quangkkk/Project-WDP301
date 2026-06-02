const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema(
    {
        name: { type: String, required: true, minlength: 1 },        
        slug: { type: String, required: true, minlength: 1 },
        status: String,
    },
    { timestamps: true }
);

const Category = mongoose.model('Category', categorySchema)

module.exports = Category;