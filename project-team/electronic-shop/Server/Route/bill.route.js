const express = require("express")
const router = express.Router();
const { billController } = require("../controllers/index");
// const validate = require("../middleware/validateUser.middleware")


router.get("/getAll", billController.getAllBills)   

router.get("/getAll/:courtId", billController.getAllBillsByCourtId)   

router.get("/getAll/date/:courtId", billController.getAllBookingsByCourtIdAndCurrentDate)   

router.get("/get/:id", billController.getBill)

router.post("/add", billController.addBill)

router.put("/update/:id", billController.updateBill)

// New route for updating booking status
router.put("/update-status/:id", billController.updateBookingStatus)

// New route for changing booking details (time or court)
router.put("/change-booking/:id", billController.changeBooking)

router.put("/update/by/:orderCode", billController.updateBillByOrderCodePayOS)

router.delete("/delete/:id", billController.deleteBill)

router.get("/getAll/user/:userId", billController.getAllBillsByUserId)

module.exports = router;