const userService = require("../service/userService")

class userController {
    // registerUser

    async registerUser (req, res) {
        try {
            const {
                name,
                username,
                email,
                password,
            } = req.body;

            const user = await userService.registerUser(name, username, email, password)

            return res.status(201).json({
                user
            })
        } catch (error) {
            console.log(error)

            if (error.message === "MISSING_REQUIRED_FIELDS") {
                return res.status(400).json({
                    message: "All fields are required"
                });
            }

            if (error.message === "EMAIL_ALREADY_EXISTS") {
                return res.status(409).json({
                    message: "Email already exists"
                });
            }

            if (error.message === "USERNAME_ALREADY_EXISTS") {
                return res.status(409).json({
                    message: "Username already exists"
                });
            }

            return res.status(500).json({
                message: "Failed to register user"
            });
        }
    }

    async loginUser (req, res) {
        try {
            const { email,  password } = req.body
            
            const user = await userService.loginUser(email, password)

            return res.status(200).json(user)

        } catch (error) {
            console.log(error)
            
            if (error.message === "MISSING_REQUIRED_FIELDS") {
                return res.status(400).json({
                    message: "Email and password are required"
            });
        }

            if (error.message === "INVALID_CREDENTIALS") {
                return res.status(401).json({
                    message: "invalid credentials"
                })
            }
            
            return res.status(500).json({
                message: "Failed to login"
            })
        }


    }
}
module.exports = new userController()