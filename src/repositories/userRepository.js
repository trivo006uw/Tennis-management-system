const pool = require("../../config/db")

class userRepository {
    // Get user with id
    async getUserByID (user_id) {
        const result = await pool.query(
            "SELECT * FROM users WHERE id = $1;",
            [user_id]
        );

        return result.rows[0];
    }

    // create user
    async createUser (name, username, email, passHash, role) {
        const result = await pool.query(
            `INSERT INTO users (
                name,
                username, 
                email, 
                password_hash,
                role
            )
            VALUES ($1, $2, $3, $4, $5)
             RETURNING id, name, username, email, role, created_at;`,
            [name, username, email, passHash, role]
            
        )
        return result.rows[0]
    }

    // get user by email to chcek for dup
    async getUserByEmail (email) {
        const result = await pool.query(
            `SELECT * FROM users WHERE email = $1;`,
            [email]
        )
        return result.rows[0];
    }

    // get user by username to check for dup
    async getUserByUsername (username) {
        const result = await pool.query(
            `SELECT * FROM users WHERE username = $1;`,
            [username]
        )
        return result.rows[0];
    }
}

module.exports = new userRepository();