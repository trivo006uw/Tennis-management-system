const jwt = require("jsonwebtoken")

function createTestToken(user) {
    return jwt.sign(
        {
            user_id: user.id,
            role: user.role
        },
        process.env.JWT_SECRET,
        { expiresIn: "2h" }

    )
}

module.exports = { createTestToken }