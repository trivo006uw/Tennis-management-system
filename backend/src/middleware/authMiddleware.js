const jwt = require("jsonwebtoken")

function authenticateToken(req, res, next) {
    // 1. Read the Authorization header
    const authHeader = req.headers.authorization;

    // 2. Extract the token after "Bearer "

    if (!authHeader || !/^Bearer \S+$/i.test(authHeader)) {
        return res.status(401).json({
            message: "Valid Bearer token required"
        });
    }

    const token = authHeader.split(" ")[1];

    // 3. Reject requests without a token
    if (!token) {
        return res.status(401).json({
            message: "Access token required"
        });
    }

    // 4. Verify the token
    try {
        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );
        const user_id = Number(decoded.user_id);

        if (
            !Number.isSafeInteger(user_id) ||
            user_id <= 0 ||
            !["admin", "organizer", "player"].includes(decoded.role)
        ) {
            return res.status(401).json({
                message: "Invalid token payload"
            });
        }

        // 5. Attach the decoded user information
        req.user = decoded;

        // 6. Continue to the next middleware/controller
        next();

    } catch (error) {
        return res.status(401).json({
            message: "Invalid or expired token"
        });
    }
}

module.exports = authenticateToken;
