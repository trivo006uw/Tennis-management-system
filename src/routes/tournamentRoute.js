const express = require("express")
const tournamentController = require("../controllers/tournamentController")
const authenticateToken = require("../middleware/authMiddleware")
const authorizeRole = require("../middleware/roleMiddleware")
const router = express.Router()

router.post("/", authenticateToken, authorizeRole("admin", "organizer"), (req, res) => {
    tournamentController.createTournament(req, res)
})

router.get("/", (req, res) => {
    tournamentController.getAllTournaments(req, res)
})

router.get("/:id", tournamentController.getTournamentById)

module.exports = router