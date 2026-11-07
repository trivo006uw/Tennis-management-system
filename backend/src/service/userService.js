const bcrypt = require("bcrypt")
const userRepository = require("../repositories/userRepository")
const jwt = require("jsonwebtoken")
class userService {

    // Create user
    async registerUser(name, username, email, password) {
        // Validate all fields
        if (
            name == null ||
            username == null ||
            email == null ||
            password == null
        ) {
            throw new Error("MISSING_REQUIRED_FIELDS");
        }

        if (
            typeof name !== "string" ||
            typeof username !== "string" ||
            typeof email !== "string" ||
            typeof password !== "string"
        ) {
            throw new Error("INVALID_INPUT");
        }

        name = name.trim();
        username = username.trim();
        email = email.trim().toLowerCase();
        if (!name || !username || !email || !password) {
            throw new Error("MISSING_REQUIRED_FIELDS");
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            throw new Error("INVALID_EMAIL");
        }

        if (username.length < 3 || username.length > 30) {
            throw new Error("INVALID_USERNAME");
        }

        if (password.length < 8) {
            throw new Error("WEAK_PASSWORD");
        }

        //Basic check for dup
        const existingEmail = await userRepository.getUserByEmail(email)
        if (existingEmail) {
            throw new Error("EMAIL_ALREADY_EXIST")
        }

        const existingUser = await userRepository.getUserByUsername(username)
        if (existingUser) {
            throw new Error("USERNAME_ALREADY_EXIST")
        }

        //Test password
        const passHash = await bcrypt.hash(password, 10)
        
        //Test for DB duplicate or other DB error
        try {
            const user = await userRepository.createUser(
                name, username, email, passHash, 'player'
            )
            return user
        } catch (error) {
            if (error.code === "23505") {
                throw new Error("USER_ALREADY_EXIST");
            }

            throw error;
        }

    }

    async loginUser(email, password) {
        //Validate All fields
        if (email == null ||
            password == null) {

            throw new Error("MISSING_REQUIRED_FIELDS")
        }

        if (typeof email !== "string" || typeof password !== "string") {
            throw new Error("INVALID_CREDENTIALS");
        }

        email = email.trim().toLowerCase();
        password = password.trim()
        if (!email || !password) {
            throw new Error("MISSING_REQUIRED_FIELDS")
        }

        const user = await userRepository.getUserByEmail(email)
        if (!user) {
            throw new Error("INVALID_CREDENTIALS")
        }
        
        
        //Matching Password
        const isMatch = await bcrypt.compare(
            password,
            user.password_hash
        )
        if (!isMatch) {
            throw new Error("INVALID_CREDENTIALS");
        }

        //Create jwt token
        const token = jwt.sign(
            {   user_id: user.id,
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
        //Validate all fields
        const id = Number(userId);
        if (!Number.isSafeInteger(id) || id <= 0) {
            throw new Error("INVALID_USER_ID");
        }

        const user = await userRepository.getUserByID(id)
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