const express = require("express")
const userController = require("../controllers/userController")
const authenticateToken = require("../middleware/authMiddleware");

const router = express.Router()

//register player endpoint
router.post("/register", (req, res) => {
    userController.registerUser(req, res)
})

router.post("/login", (req, res) => {
    userController.loginUser(req, res)
})

router.get("/me", authenticateToken, userController.getCurrentUser)

module.exports = router