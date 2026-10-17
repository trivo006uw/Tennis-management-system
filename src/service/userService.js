const bcrypt = require("bcrypt")
const userRepository = require("../repositories/userRepository")
const jwt = require("jsonwebtoken")
class userService {

    // Create user
    async registerUser(name, username, email, password) {
        if (!name || !username || !email || !password) {
            throw new Error("MISSING_REQUIRED_FIELDS");
        }

        const existingEmail = await userRepository.getUserByEmail(email)
        if (existingEmail) {
            throw new Error("EMAIL_ALREADY_EXIST")
        }

        const existingUser = await userRepository.getUserByUsername(username)
        if (existingUser) {
            throw new Error("USERNAME_ALREADY_EXIST")
        }

        const passHash = await bcrypt.hash(password, 10)
    

        const user = await userRepository.createUser(
            name, username, email, passHash, 'player'
        )
        return user
    }

    async loginUser(email, password) {
        if (!email || !password) {
            throw new Error("MISSING_REQUIRED_FIELDS")
        }

        const user = await userRepository.getUserByEmail(email)
        if (!user) {
            throw new Error("INVALID_CREDENTIALS")
        }
        

        const isMatch = await bcrypt.compare(
            password,
            user.password_hash
        )


        if (!isMatch) {
            throw new Error("INVALID_CREDENTIALS");
        }

        const token = jwt.sign(
            {   userId: user.id,
                role: user.role
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "2h"
            }
        )

        return {
            token,
            id: user.id,
            name: user.name,
            username: user.username,
            email: user.email,
            role: user.role
        };
    }


    async getCurrentUser(userId) {
        const user = await userRepository.getUserByID(userId)

        if (!user) {
            throw new Error("USER_NOT_FOUND")
        }
        return {
            id: user.id,
            name: user.name,
            username: user.username,
            role: user.role
        }
    }
 }  


    

module.exports = new userService()