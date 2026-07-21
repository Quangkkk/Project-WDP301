const express = require("express");
const review = require("../Controller/review.controller");
const verifyToken = require("../middleware/verifyToken");
const authorizeRoles = require("../middleware/authorizeRoles");

const router = express.Router();

// Lay danh sach review cua customer dang dang nhap.
router.get("/mine", verifyToken, authorizeRoles("CUSTOMER"), review.getMyReviews);

// Tao review moi (Chi danh cho Customer)
router.post("/", verifyToken, authorizeRoles("Customer"), review.createReview);

// Sua review ca nhan (Chi danh cho Customer)
router.put("/:id", verifyToken, authorizeRoles("Customer"), review.updateReview);

// Xoa review: customer xoa review cua minh, backoffice xoa review vi pham
router.delete("/:id", verifyToken, review.deleteReview);

// An review vi pham (Danh cho Admin, Manager, Staff)
router.patch("/admin/reviews/:id/hide", verifyToken, authorizeRoles("Admin", "Manager", "Staff"), review.hideReview);

module.exports = router;