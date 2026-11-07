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
            if (error.message === "INVALID_INPUT") {
                return res.status(400).json({
                    message: "Invalid input types"
                });
            }

            if (error.message === "INVALID_EMAIL") {
                return res.status(400).json({
                    message: "Invalid email format"
                });
            }

            if (error.message === "INVALID_USERNAME") {
                return res.status(400).json({
                    message: "Username must be 3-30 characters"
                });
            }

            if (error.message === "WEAK_PASSWORD") {
                return res.status(400).json({
                    message: "Password must be at least 8 characters"
                });
            }

            if (error.message === "EMAIL_ALREADY_EXIST") {
                return res.status(409).json({
                    message: "Email already exists"
                });
            }

            if (error.message === "USERNAME_ALREADY_EXIST") {
                return res.status(409).json({
                    message: "Username already exists"
                });
            }

            if (error.message === "USER_ALREADY_EXIST") {
                return res.status(409).json({
                    message: "User already exists"
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

            return res.status(200).json({
                user
            })

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


    async getCurrentUser(req, res) {
        try {
            const user_id = req.user.user_id;

            const user = await userService.getCurrentUser(user_id);

            return res.status(200).json({
                user
            });

        } catch (error) {
            console.error(error);
            if (error.message === "INVALID_USER_ID") {
                return res.status(400).json({
                    message: "Invalid id"
                })
            }
            if (error.message === "USER_NOT_FOUND") {
                return res.status(404).json({
                    message: "User not found"
                });
            }

            return res.status(500).json({
                message: "Failed to retrieve user"
            });
        }
    }

}

module.exports = new userController()