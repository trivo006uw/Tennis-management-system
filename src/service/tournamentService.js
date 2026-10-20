const tourneyRepository = require("../repositories/tournamentRepository")

class TournamentService {

    // helper function 
    
    async createTournament(created_by_user_id, title, location, start_date, end_date, max_players) {
        if (!title || !location || !start_date || !end_date || !max_players) {
            throw new Error("MISSING_REQUIRED_FIELDS")
        }

        if (typeof(title) !== "string" || typeof(location) !== "string" || !title.trim() || !location.trim()) {
            throw new Error("INVALID_TITLE_OR_LOCATION")
        }

        const start = new Date(start_date);
        const end = new Date(end_date);
        if (Number.isNaN(start.getTime()) ||
            Number.isNaN(end.getTime()) ||
            start >= end) {

            throw new Error("INVALID_DATE_RANGE")
        }


        if (!Number.isInteger(max_players) || max_players <= 0) {
            throw new Error("INVALID_MAX_PLAYER_RANGE")
        }

        const existingTourney = await tourneyRepository.findDuplicate(title, location, start_date)

        if (existingTourney) {
            throw new Error("TOURNAMENT_ALREADY_EXISTS")
        }

        try {
            const tourney = await tourneyRepository.createTournament(created_by_user_id, title, location, start_date, end_date, max_players)
            return tourney
        } catch (error) {
            console.error(error)

            if (error.code === "23505" && error.constraint === "unique_tournament_identity") {
                throw new Error("TOURNAMENT_ALREADY_EXISTS")
            }

            // maybe db throw other error instead
            throw error
        }
        
        
    }
}

module.exports = new TournamentService()