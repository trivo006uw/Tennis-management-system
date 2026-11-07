const pool = require("../../config/db");

class PlayerRepository {
    async getAllPlayers() {
        const result = await pool.query(
                "SELECT * FROM players;"
            );

            return result.rows;
    }

    // Get player with ID using async and params

    async getPlayerByID(id) {
        const result = await pool.query(
            "SELECT * FROM players WHERE id = $1;",
            [id]
        );
        return result.rows[0]
    }

    // Create player
    async createPlayer(userId) {
        const result = await pool.query(
            `INSERT INTO players (user_id)
            VALUES ($1)
            RETURNING *;`,
            [userId]
        )

        return result.rows[0]
    }

    // get player with the user_id not player id
    async getPlayerByUserID(userId) {
        const result = await pool.query(
            "SELECT * FROM players WHERE user_id = $1;",
            [userId]
        );

        return result.rows[0];
    }

    //update player with id and for rating
    async updatePlayerRating(id, rating) {
        const result = await pool.query(
            `UPDATE players
            SET rating = $1
            WHERE id = $2
            RETURNING *;`,
            [rating, id]
        )
        return result.rows[0]
    }

    // Delete player with id 
    async deletePlayer(id) {
        const result = await pool.query(
            `DELETE FROM players
            WHERE id = $1
            RETURNING *;`,
            [id]
        )
        return result.rows[0]
    }
}

module.exports = new PlayerRepository();