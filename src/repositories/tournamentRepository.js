const pool = require("../../config/db")

class tournamentRepository {
    async createTournament(created_by_user_id, title, location, start_date, end_date, max_players) {
        const tourney = await pool.query(`
            INSERT INTO tournaments (
                created_by_user_id,
                title,
                location,
                start_date,
                end_date,
                max_players
            )
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING created_by_user_id, id, title, location, start_date, end_date, max_players, status, created_at;
            `, [created_by_user_id, title, location, start_date, end_date, max_players])
            return tourney.rows[0]
    }

    async findDuplicate(title, location, start_date) {
        const result = await pool.query(`
            SELECT * FROM tournaments
            WHERE LOWER(TRIM(title)) = LOWER(TRIM($1)) AND LOWER(TRIM(location)) = LOWER(TRIM($2)) AND start_date = $3
            LIMIT 1;
        `, [title, location, start_date])
        return result.rows[0]
    }
}
    
module.exports = new tournamentRepository