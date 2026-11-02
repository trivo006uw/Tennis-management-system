const pool = require("../../config/db")

let counter = 0;

function buildTournament(overrides = {}) {
    counter++;

    return {
        title: `Test Tournament ${counter}`,
        location: "Seattle",
        start_date: "2026-11-10T09:00:00",
        end_date: "2026-11-11T18:00:00",
        max_players: 16,
        ...overrides
    };
}

async function createTournament(organizerId, overrides = {}) {
    const tournament = buildTournament(overrides)

    const result = await pool.query(`
        INSERT INTO tournaments
            (title, location, start_date, end_date,
             max_players, created_by_user_id)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *
    `, [tournament.title, tournament.location, 
        tournament.start_date, tournament.end_date, 
        tournament.max_players, organizerId])
    
    return result.rows[0]
}

module.exports = { buildTournament, createTournament };