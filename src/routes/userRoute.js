const express = require("express")
const userController = require("../controllers/userController")

const router = express.Router()

//register player endpoint
router.post("/register", (req, res) => {
    userController.registerUser(req, res)
})

router.post("/login", (req, res) => {
    userController.loginUser(req, res)
})

module.exports = router