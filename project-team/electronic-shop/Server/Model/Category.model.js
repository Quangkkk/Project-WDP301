const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema(
    {
        name: { type: String, required: true, minlength: 1, maxlength: 30 },        
    },
    { timestamps: true }
);

const Category = mongoose.model('Category', categorySchema)

module.exports = Category;