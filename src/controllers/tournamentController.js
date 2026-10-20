
const tournamentService = require("../service/tournamentService")

class tournamentController {
    async createTournament(req, res) {
        try {
            const {title, location, start_date, end_date, max_players} = req.body
            const user_id = req.user.userId
            const tourney = await tournamentService.createTournament(user_id, title, location, start_date, end_date, max_players)

            return res.status(201).json(
                tourney
            )
        } catch (error) {
            console.error.error

            if (error.message === "MISSING_REQUIRED_FIELDS") {
                return res.status(400).json({
                    message: "All fields are required"
                });
            }

            if (error.message === "INVALID_TITLE_OR_LOCATION") {
                return res.status(400).json({
                    message: "invalid title or location"
                });
            }

            if (error.message === "INVALID_DATE_RANGE") {
                return res.status(400).json({
                    message: "invalid date range"
                });
            }

            if (error.message === "INVALID_MAX_PLAYER_RANGE") {
                return res.status(400).json({
                    message: "invalid max player"
                });
            }

            if (error.message === "TOURNAMENT_ALREADY_EXISTS") {
                return res.status(409).json({
                    message: "tournament already exist"
                })
            }

            return res.status(500).json({
                message: "failed to create tournament"
            })
        }
    }

    async getAllTournaments(req, res) {
        try {
            const tournaments = await tournamentService.getAllTournaments()
            return res.status(200).json({
                tournaments
            })
        } catch (error) {
            // Handle errors
            console.error(error)
            return res.status(500).json({
                message: "Internal Error"
            })
        }
    }

    async getTournamentById(req, res) {
        try {
            const id = req.params.id
            const tournament = await tournamentService.getTournamentById(id)
            return res.status(200).json({
                tournament
            })
        } catch (error) {
            // Handle errors
            console.error(error)
            
            if (error.message === "INVALID_TOURNAMENT_ID") {
                return res.status(400).json({
                    message: "Invalid id"
                })
            }

            if (error.message === "NO_TOURNAMENT_FOUND") {
                return res.status(404).json({
                    message: "No tournament found with id"
                })
            }

            return res.status(500).json({
                message: "Internal Error"
            })
        }
    }
}
module.exports = new tournamentController()