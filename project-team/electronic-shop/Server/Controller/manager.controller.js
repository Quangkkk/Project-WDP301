const mongoose = require("mongoose");
const managerService = require("../services/manager.service");

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

// Controller lay danh sach staff
const getStaffList = async (req, res) => {
  try {
    const data = await managerService.getStaffList();
    return res.status(200).json({
      success: true,
      count: data.length,
      data,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to get staff list",
      error: error.message,
    });
  }
};

// Controller lay hieu suat cua staff
const getStaffPerformance = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || !isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Valid staff ID is required" });
    }

    const data = await managerService.getStaffPerformance(id);
    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    let statusCode = 500;
    if (error.message === "Staff not found") {
      statusCode = 404;
    }
    return res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to get staff performance",
      error: error.message,
    });
  }
};

module.exports = {
  getStaffList,
  getStaffPerformance,
};
