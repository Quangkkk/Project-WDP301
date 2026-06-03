const mongoose = require("mongoose");
const db = require('../Model');
const {PayOS} = require('@payos/node');
// const { utcToZonedTime } = require("date-fns-tz");
const Bill = db.bill;
const Product = db.product;
require('dotenv').config();


const createPayment = async (req, res, next) => {

    /////////////init varible///////////////////////
    const data = req.body
    // const timeRentalParse = parse(data.timeRental, "dd/MM/yyyy HH:mm:ss", new Date())
  
    
     // const payos = new PayOS("client_id", "api-key", "checksum-key")
     const payos = new PayOS( process.env.PAYOS_CLIENT_ID, process.env.PAYOS_API_KEY, process.env.PAYOS_CHECKSUM_KEY)
    const YOUR_DOMAIN = "http://localhost:5173"

    try {

        //find product
        // const product = await Product.findById(id)
        //     .select('-createdAt -updatedAt -__v -_id')
console.log(123);

        // create new bill
        const newBillData = {
            amount_price: 1000,
            user_id: data.userId,
            order_code_pay_os: getRandomNumber(),
            // status: "PENDING",
        };
        const newBill = new Bill(newBillData);
        const savedBill = await newBill.save();
        
        // console.log("newBill: ", newBill)
        console.log("data: ", data);
        
        // data send to PAYOS
        const order = {
            amount: data.price,
            description: `${newBill.id}`,
            buyerName: data.buyerName,
            buyerEmail: data.buyerEmail,
            buyerPhone: data.buyerPhone,
            orderCode: savedBill.order_code_pay_os,
            // items: [{name: court.id, price: court.price, quantity: 1}],
            returnUrl: `${YOUR_DOMAIN}/`,
            cancelUrl: `${YOUR_DOMAIN}/`,
                        // cancelUrl: `${YOUR_DOMAIN}/product-da?courtName=${encodeURIComponent(data.buyer)}`,

            // expiredAt: timestamp,
            //"signature": "aec38349957f1a6c22ded683d06477ac5dfe047cf5f23c70dc8e048"//require
        }
       console.log("order: ", order);
       

          
const paymentLink = await payos.paymentRequests.create(order);

            console.log(paymentLink)
            // res.redirect(303, paymentLink.checkoutUrl)
            return res.status(200).json({
                success: true,
                link: paymentLink.checkoutUrl,
            });
    } catch (error) {
        console.error(error.message)
        console.error(error)
        res.status(error.status || 500).json({
            success: false,
            message: error.message || "Internal Server Error"
        });
    }
};

// {
//   bin: '970422',
//   accountNumber: 'VQRQAJLBN7022',
//   accountName: 'LE VUONG HOANG MINH',
//   amount: 1000,
//   description: '6a1f15f9a33c1521be644371',
//   orderCode: 3781571218714643,
//   currency: 'VND',
//   paymentLinkId: '9b0e6bb6b0564b41a1de206e47bc7645',
//   status: 'PENDING',
//   expiredAt: null,
//   checkoutUrl: 'https://pay.payos.vn/web/9b0e6bb6b0564b41a1de206e47bc7645',
//   qrCode: '00020101021238570010A000000727012700069704220113VQRQAJLBN70220208QRIBFTTA5303704540410005802VN622808246a1f15f9a33c1521be644371630422C4'
// }

// webhook-url https using ngrok
//  Forwarding:  https://fever-sappy-snowless.ngrok-free.dev/payment/receive-hook

const webHook = async (req, res, next) => {

    // console.log(req.body)

    //dieu kien kiem tra webhook co tra response khong
    if(req.body.data.orderCode!==123){
        console.log(req.body)
        const data = req.body.data
        // const timeRental =  parse(req.body.data.description, "dd/MM/yyyy hh:mm:ss a", new Date());
        // console.log(timeRental)

            

        
        const billData = {
            counter_account_name: data.counterAccountName,
            counter_account_number: data.counterAccountNumber,
            transaction_bank_time: data.transactionDateTime, // Đổi từ transaction_date_time sang transaction_bank_time
            reference_bank: data.reference,
            status:  "PAID",
          };

        try {

            if (!mongoose.Types.ObjectId.isValid(data.description)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid borrower ID",
                });
                }

            //payment done
            // const updateBill = await Bill.findByIdAndUpdate(data.description, billData, { new: true, runValidators: true });
            const updateBill = await Bill.findByIdAndUpdate(data.description, billData, { returnDocument: "after", runValidators: true });

            if (!updateBill) {
                return res.status(404).json({
                success: false,
                message: "Bill not found",
                });
            }
            console.log("updateBill: ", updateBill);



                    
             //create new bill
            const newNoti = {
                content: "Bạn đã thanh toán thành công",
                user_id: updateBill.user_id,
                bill_id: data.description
            };
            // const noti = new Bill(newNoti);
            // const savedNoti = await noti.save();



            return res.status(200).json({
                success: true,
                bill: updateBill,
            });
        } catch (error) {
            console.error(error);

        }

    }else{
        console.log(123)
        console.log("connect payos success")
        return res.status(200).json({
            success: true,
            message: "connect success",
        });
    }
  
    
 
};

function getRandomNumber() {
    return Math.floor(Math.random() * (9007199254740991 - 124)) + 124;
}


const paymentController = {
    createPayment,
    webHook,
};

module.exports = paymentController;

// signature
// // for create-payment-link signature
// const signature = await payos.crypto.createSignatureOfPaymentRequest(data, payos.checksumKey);
// // of
// const signature = await payos.crypto.createSignatureFromObj(
//   { amount, cancelUrl, description, orderCode, returnUrl },
//   payos.checksumKey,
// );

// // for payment-requests and webhook signature
// const signature = await payos.crypto.createSignatureFromObj(data, payos.checksumKey);

// // for payouts signature
// const signature = await payos.crypto.createSignature(payos.checksumKey, data);
