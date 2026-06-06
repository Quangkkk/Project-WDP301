const mongoose = require("mongoose")

const billSchema = new mongoose.Schema({
    amount_price: { type: Number, required: true },
    counter_account_name: { type: String, required: false },
    counter_account_number: { type: String, required: false },
    order_code_pay_os: { type: Number, required: true, unique: true, },
    status: { 
        type: String,
        enum: ['PAID', 'PENDING', 'CANCEL'],
        default: 'PENDING',
        required: true,
    },
    order_status: { 
        type: String,
        enum: ['SHIPED', 'FREE', 'CANCEL', 'PENDING'],
        default: 'FREE',
        required: true,
    },
    transaction_bank_time: { type: String, required: false, },
    reference_bank: { type: String, required: false, },
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User',required: false },

}, {
    timestamps: true
})


const Bill = mongoose.model('Bill', billSchema)

module.exports = Bill;