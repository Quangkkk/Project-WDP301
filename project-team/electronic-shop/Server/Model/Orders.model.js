const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
    {
        userId: { type: mongoose.Schema.Types.ObjectId, required: true },
        
    },
    { timestamps: true }
);

const Order = mongoose.model('Order', orderSchema)

module.exports = Order;