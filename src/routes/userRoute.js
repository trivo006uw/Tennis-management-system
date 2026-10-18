const express = require("express")
const userController = require("../controllers/userController")
const authenticateToken = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");

const router = express.Router()

//register player endpoint
router.post("/register", (req, res) => {
    userController.registerUser(req, res)
})

router.post("/login", (req, res) => {
    userController.loginUser(req, res)
})

router.get("/me", authenticateToken, userController.getCurrentUser)

router.get("/admin-test", authenticateToken,
    authorizeRoles("admin"), (req, res) => {
        return res.status(200).json({
            message: "Welcome, admin!",
            user: req.user
        });
    })

module.exports = router