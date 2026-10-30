const pool = require("../config/db")
const request = require("supertest")
const app = require("../src/app")
const userBuilder = require("../tests/factory/userTestFactory")
const tournamentBuilder = require("../tests/factory/tournamentTestFactory")

describe("Tournament API", () => {
    beforeAll(async () => {
        const result = await pool.query(`
            SELECT current_database() AS name
        `)
        if (result.rows[0].name !== "tennis_test") {
            throw new Error("must be connected to test db")
        }
    })

    afterAll(async () => {
        await pool.end()
    })

    describe("GET /tournament", () => {
        test("should return all tournaments", async () => {
            const response = await request(app)
            .get("/tournaments")

            expect(response.statusCode).toBe(200)
            expect(Array.isArray(response.body.tournaments)).toBe(true)
        })
    })

    test("Factory generates customizable tournament data", () => {
        const tournament = tournamentBuilder.buildTournament ({
            max_players: 32
        })

        expect(tournament.max_players).toBe(32);
        expect(tournament.location).toBe("Seattle");
        expect(tournament.title).toMatch(/^Test Tournament/);
    })

})