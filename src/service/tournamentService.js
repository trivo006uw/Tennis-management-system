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


        try {
            const tourney = await tourneyRepository.createTournament(created_by_user_id, 
                                                                title, location, start_date,
                                                                 end_date, max_players)
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

    async getAllTournaments() {
        const result = await tourneyRepository.getAllTournaments()

        return result
    }

    async getTournamentByid(id) {
        const tournamentId = Number(id)

        if (!Number.isSafeInteger(tournamentId) || tournamentId <= 0) {
            throw new Error("INVALID_TOURNAMENT_ID")
        }

        const result = await tourneyRepository.getTournamentByid(tournamentId)

        return result
    }


    async updateTournament(id, user_id, role, newDetails) {
        
        const tournamentId = Number(id)

        if (!Number.isSafeInteger(tournamentId) || tournamentId <= 0) {
            throw new Error("INVALID_TOURNAMENT_ID")
        }

        const tournament = await tourneyRepository.getTournamentById(tournamentId)
        if (!tournament) {
            throw new Error("TOURNAMENT_NOT_FOUND")
        }

        const created_by = tournament.created_by_user_id

        if (
            role !== "admin" &&
            !(role === "organizer" && Number(user_id) === Number(created_by))
        ) {
            throw new Error("FORBIDDEN");
        }

        try {
            const validatedDetails = this.validateFields(newDetails, tournament);
            const updatedTournament = await tourneyRepository.updateTournament(
                tournamentId,
                validatedDetails
            )
            return updatedTournament;

        } catch (error) {
             if (
                error.code === "23505" &&
                error.constraint === "unique_tournament_identity"
            ) {
                throw new Error("TOURNAMENT_ALREADY_EXISTS");
            }
            throw error;
        }
    }

    validateFields(newDetails, tournament) {
        const allowedFields = [
            "title",
            "location",
            "start_date",
            "end_date",
            "max_players"
        ];

        if (
            !newDetails ||
            typeof newDetails !== "object" ||
            Array.isArray(newDetails)
        ) {
            throw new Error("INVALID_UPDATE_FIELDS");
        }

        const fields = Object.keys(newDetails);

        if (
            fields.length === 0 ||
            fields.some(field => !allowedFields.includes(field))
        ) {
            throw new Error("INVALID_UPDATE_FIELDS");
        }


        const { title, location, start_date, end_date, max_players } = newDetails;

        // Validate title if supplied
        if (title !== undefined) {
            if (typeof(title) !== "string" || !title.trim()) {
                throw new Error("INVALID_TITLE")
            }
        }

        // Validate location if supplied
        if (location !== undefined) {
            if (typeof(location) !== "string" || !location.trim()) {
                throw new Error("INVALID_LOCATION")
            }
        }
        // Later: dates and max_players
        if (
            (start_date !== undefined && typeof start_date !== "string") ||
            (end_date !== undefined && typeof end_date !== "string")
        ) {
            throw new Error("INVALID_DATE_RANGE");
        }

        const start = new Date(
            start_date !== undefined
                ? start_date
                : tournament.start_date
        );

        const end = new Date(
            end_date !== undefined
                ? end_date
                : tournament.end_date
        );

        if (
            Number.isNaN(start.getTime()) ||
            Number.isNaN(end.getTime()) ||
            start >= end
        ) {
            throw new Error("INVALID_DATE_RANGE");
        }

        if (max_players !== undefined) {
            if (!Number.isInteger(max_players) || max_players <= 0) {
                throw new Error("INVALID_MAX_PLAYER_RANGE")
            }
        }
        return newDetails;
    }
}

module.exports = new TournamentService()