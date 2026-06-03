const mongoose = require("mongoose");
const db = require('../models');
const Bill = db.bill;
const User = db.User;
const { parse, addHours, format, isBefore, isAfter } =  require("date-fns");


const getBill = async (req, res, next) => {
  try {
    const billId = req.params.id;

    // if (!mongoose.Types.ObjectId.isValid(billId)) {
    //   return res.status(400).json({
    //     success: false,
    //     message: "Invalid bill ID",
    //   });
    // }

    const bill = await Bill.findById(billId);

    if (!bill) {
      return res.status(404).json({
        success: false,
        message: "Bill not found",
      });
    }

    return res.status(200).json({
      success: true,
      bill,
    });
  } catch (err) {
    console.error(err); 
    return next(err);
  }
};

const getAllBills = async (req, res, next) => {
  try {
    // Chỉ populate user_id vì model không có court_id
    const bills = await Bill.find({}).populate("user_id", ["email", "phone", "name"]);
    
    if (!bills.length) {
      return res.status(404).json({
        success: false,
        message: "No bills found"
      });
    }

    return res.status(200).json({
      success: true,
      billsList: bills
    });
  } catch (err) {
    console.error(err); 

    return res.status(err.code || 400).json({
      success: false,
      message: err.message,
      error: err
    });
  }
};





const addBill = async (req, res, next) => {
  const billData = {
    amount_price: req.body.rentalPrice,  // Đổi từ retal_price sang amount_price
    counter_account_name: req.body.counterAccountName,
    counter_account_number: req.body.counterAccountNumber,
    order_code_pay_os: req.body.orderCodePayOs,
    status: req.body.status || 'pending', // Default to pending if not provided
    status: req.body.status || 'pending',
    transaction_bank_time: req.body.transactionDateTime, // Đổi từ transaction_date_time sang transaction_bank_time
    reference_bank: req.body.referenceBank,
    user_id: req.body.userId,
  };
  
  try {
    //check order_code_pay_os
    const checkBill = await Bill.findOne({order_code_pay_os: billData.order_code_pay_os });
    if(checkBill){
      return res.status(400).json({
        success: false,
        message: "PayOS code already exit",
      });
    }
    const newBill = new Bill(billData);
    
    // Kiểm tra order_code_pay_os là số, không phải ObjectId
    if (isNaN(newBill.order_code_pay_os)) {
      return res.status(400).json({
        success: false,
        message: "order_code_pay_os must be a number",
      });
    }
    
    const savedBill = await newBill.save();

    return res.status(200).json({
      success: true,
      newBill: savedBill,
    });
  } catch (err) {
    console.error(err); 
    next(err);
  }
};


const updateBill = async (req, res, next) => {
  try {
    const billId = req.params.id;
    const updatedData = {
      amount_price: req.body.rentalPrice, // Đổi từ retal_price sang amount_price
      user_id: req.body.userId,
      counter_account_name: req.body.counterAccountName,
      counter_account_number: req.body.counterAccountNumber,
      status: req.body.status,
      transaction_bank_time: req.body.transactionDateTime, // Đổi từ transaction_date_time sang transaction_bank_time
      reference_bank: req.body.referenceBank,
    };

    // Xóa các trường undefined
    Object.keys(updatedData).forEach(key => 
      updatedData[key] === undefined && delete updatedData[key]
    );

    if (!mongoose.Types.ObjectId.isValid(billId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid bill ID",
      });
    }

    const bill = await Bill.findByIdAndUpdate(billId, updatedData, { new: true, runValidators: true });

    if (!bill) {
      return res.status(404).json({
        success: false,
        message: "Bill not found",
      });
    }

    return res.status(200).json({
      success: true,
      updatedBill: bill,
    });
  } catch (err) {
    console.error(err);

    if (err.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        error: err.message,
      });
    }
    return next(err);
  }
};

// New function specifically for updating booking status
const updateBookingStatus = async (req, res, next) => {
  try {
    const billId = req.params.id;
    const { status } = req.body;

    if (!mongoose.Types.ObjectId.isValid(billId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid bill ID",
      });
    }

    // Validate the status value
    const validStatuses = ['pending', 'success', 'cancel', 'paid'];
    if (!validStatuses.includes(status?.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: "Invalid status value. Status must be one of: pending, success, cancel, paid",
      });
    }

    // Get the current bill to check status transitions
    const currentBill = await Bill.findById(billId);
    
    if (!currentBill) {
      return res.status(404).json({
        success: false,
        message: "Bill not found",
      });
    }

    // Prevent certain status transitions
    if (currentBill.status?.toLowerCase() === 'cancel' && status !== 'cancel') {
      return res.status(400).json({
        success: false,
        message: "Cannot change status from 'cancel' to another status",
      });
    }

    if ((currentBill.status?.toLowerCase() === 'success' || currentBill.status?.toLowerCase() === 'paid') && status === 'pending') {
      return res.status(400).json({
        success: false,
        message: "Cannot change status from 'success' to 'pending'",
      });
    }

    // Bỏ kiểm tra time_rental vì model không có trường này

    // Update the bill status
    const updatedBill = await Bill.findByIdAndUpdate(
      billId, 
      { status }, 
      { new: true, runValidators: true }
    );

    return res.status(200).json({
      success: true,
      message: `Booking status updated to '${status}' successfully`,
      updatedBill,
    });
  } catch (err) {
    console.error(err);

    if (err.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        error: err.message,
      });
    }
    return next(err);
  }
};

// New function for changing booking details (time or court)
const changeBooking = async (req, res, next) => {
  try {
    const billId = req.params.id;
    const { amount_price } = req.body;  // Chỉ lấy amount_price vì không có các trường khác

    if (!mongoose.Types.ObjectId.isValid(billId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid bill ID",
      });
    }

    // Get the current bill
    const currentBill = await Bill.findById(billId);
    if (!currentBill) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    // Prevent changes to cancelled bookings
    if (currentBill.status?.toLowerCase() === 'cancel') {
      return res.status(400).json({
        success: false,
        message: "Cannot modify a cancelled booking",
      });
    }

    // Build update object based on what needs to be changed
    const updateData = {};
    
    // Add amount_price to update data if provided
    if (amount_price) updateData.amount_price = amount_price;
    
    // If no changes requested
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No changes requested",
      });
    }
    
    // Update the bill
    const updatedBill = await Bill.findByIdAndUpdate(
      billId, 
      updateData, 
      { new: true, runValidators: true }
    ).populate("user_id", ["email", "phone", "name"]);
    
    return res.status(200).json({
      success: true,
      message: "Booking updated successfully",
      updatedBill,
    });
    
  } catch (err) {
    console.error('Error in changeBooking:', err);
    
    if (err.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        error: err.message,
      });
    }
    return next(err);
  }
};

const updateBillByOrderCodePayOS = async (req, res, next) => {
  try {
    
    const orderCode = req.params.orderCode;
    const updatedBill = {
      user_id: req.body.userId,
      // Không còn court_id
    };
    
    // Tìm với order_code_pay_os là số
    const orderCodeNumber = parseInt(orderCode);
    if (isNaN(orderCodeNumber)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order code format. Must be a number.",
      });
    }

    const bill = await Bill.findOneAndUpdate({ order_code_pay_os: orderCodeNumber }, updatedBill, { new: true, runValidators: true });
    
    if (!bill) {
      return res.status(404).json({
        success: false,
        message: "Bill not found. Wait few second and reset page",
      });
    }

    return res.status(200).json({
      success: true,
      updatedBill: bill,
    });
  } catch (err) {
    console.error(err);

    if (err.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        error: err.message,
      });
    }
    return next(err);
  }
};


const deleteBill = async (req, res, next) => {
  try {
    const billId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(billId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid bill ID",
      });
    }

    const bill = await Bill.findByIdAndDelete(billId);

    if (!bill) {
      return res.status(404).json({
        success: false,
        message: "Bill not found",
      });
    }

    return res.status(200).json({
      success: true,
      deletedBill: bill,
    });
  } catch (err) {
    console.error(err);
    return next(err);
  }
};

const getAllBillsByUserId = async (req, res, next) => {
  try {
    const userId = req.params.userId;
    const bills = await Bill.find({user_id: userId})
                          .populate("user_id", ["email", "phone", "name"])
                          .sort({createdAt: -1}); // Sắp xếp theo thời gian tạo mới nhất
    
    if (!bills.length) {
      return res.status(200).json({
        success: true,
        message: "No bills found for this user",
        billsList: []
      });
    }

    return res.status(200).json({
      success: true,
      billsList: bills
    });
  } catch (err) {
    console.error(err); 

    return res.status(err.code || 400).json({
      success: false,
      message: err.message,
      error: err
    });
  }
};

const billController = {
  getBill,
  getAllBills,
  addBill,
  updateBill,
  updateBookingStatus,
  changeBooking,
  updateBillByOrderCodePayOS,
  deleteBill,
  getAllBillsByUserId
};

module.exports = billController;