const Role = require("../models/Roles.model");

// Return the system-defined roles. Creating, editing and deleting roles
// is intentionally disabled because access rules are fixed in route files.
const getAllRoles = async (req, res) => {
  try {
    const data = await Role.find()
      .select("-__v")
      .sort({ name: 1 });

    return res.status(200).json({
      success: true,
      count: data.length,
      data,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to get roles",
      error: error.message,
    });
  }
};

module.exports = {
  getAllRoles,
};