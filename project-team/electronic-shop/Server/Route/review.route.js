const express = require("express");
const review = require("../Controller/review.controller");

const router = express.Router();

router.post("/", review.createReview);
router.get("/", review.getAllReviews);
router.get("/:id", review.getReviewById);
router.put("/:id", review.updateReviewById);
router.delete("/:id", review.deleteReviewById);

module.exports = router;