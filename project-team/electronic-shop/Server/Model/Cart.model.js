const mongoose = require("mongoose");

const cartSchema = new mongoose.Schema(
    {
        user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
        product: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: false }]   
    },
    { timestamps: true }
);

const Cart = mongoose.model('Cart', cartSchema)

module.exports = Cart;