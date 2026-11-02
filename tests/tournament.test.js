const pool = require("../config/db")
const request = require("supertest")
const app = require("../src/app")
const { createTestUser } = require("./factory/userTestFactory");
const { createTournament } = require("./factory/tournamentTestFactory");
const { buildTournament } = require("./factory/tournamentTestFactory");
const { createTestToken } = require("./factory/tokenTestFactory");

describe("Tournament API", () => {
    beforeAll(async () => {
        const result = await pool.query(`
            SELECT current_database() AS name
        `)
        if (result.rows[0].name !== "tennis_test") {
            throw new Error("must be connected to test db")
        }
    })

    describe("GET /tournament", () => {
        test("should return all tournaments", async () => {
            const response = await request(app)
            .get("/tournaments")

            expect(response.statusCode).toBe(200)
            expect(Array.isArray(response.body.tournaments)).toBe(true)
        })
    })
})

// Test with Tournaments and Organizer
describe("GET /tournament", () => {
    let organizer;
    let tournament;

    beforeEach(async () => {
        organizer = await createTestUser({
            role: "organizer"
        })
        
        tournament = await createTournament(
            organizer.id
        )
        
    })

    afterEach(async () => {
        // Remove the child record first
        if (tournament?.id != null) {
            await pool.query(
                "DELETE FROM tournaments WHERE id = $1",
                [tournament.id]
            );
        }

        if (organizer?.id != null) {
            await pool.query(
                "DELETE FROM users WHERE id = $1",
                [organizer.id]
            );
        }
    });

    test("Should return the created tournament", async () => {
        const response = await request(app)
            .get("/tournaments");

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body.tournaments)).toBe(true);

        const foundTournament = response.body.tournaments.find(
            t => t.id === tournament.id
        );

        expect(foundTournament).toBeDefined();
        expect(foundTournament.title).toBe(tournament.title);
        expect(foundTournament.location).toBe(tournament.location);
    });


    test("Should return tournament by ID", async () => {
        const response = await request(app)
            .get(`/tournaments/${tournament.id}`);

        expect(response.status).toBe(200);

        expect(response.body.tournament.id).toBe(tournament.id);
        expect(response.body.tournament.title).toBe(tournament.title);
        expect(response.body.tournament.location).toBe(tournament.location);
    });



    test("Should reject invalid tournament ID", async () => {
        const response = await request(app)
            .get("/tournaments/abc");

        expect(response.status).toBe(400);
    });

    test("Should return 404 for nonexistent tournament", async () => {
        const response = await request(app)
            .get("/tournaments/999999999");

        expect(response.status).toBe(404);
    });

})

describe("POST /tournament", () => {
    let organizer;
    let token;
    let createdTournamentId;

    beforeEach(async () => {
        organizer = await createTestUser({
            role: "organizer"
        });

        token = createTestToken(organizer);
        createdTournamentId = undefined;
    });

    afterEach(async () => {
        if (organizer?.id != null) {
        // Delete tournaments belonging to this test organizer
            await pool.query(
                "DELETE FROM tournaments WHERE created_by_user_id = $1",
                [organizer.id]
            );

            // Delete the organizer
            await pool.query(
                "DELETE FROM users WHERE id = $1",
                [organizer.id]
            );
        }
    });


    test("Should allow organizer to create tournament", async () => {
        const tournamentData = buildTournament();

        const response = await request(app)
            .post("/tournaments")
            .set("Authorization", `Bearer ${token}`)
            .send(tournamentData);

        expect(response.status).toBe(201);

        // Adjust property names if controller differs.
        const created = response.body.tournament;

        expect(created).toBeDefined();

        createdTournamentId = created.id;

        expect(created.title).toBe(tournamentData.title);
        expect(created.location).toBe(tournamentData.location);

        // Confirm the record actually exists in PostgreSQL.
        const result = await pool.query(
            "SELECT * FROM tournaments WHERE id = $1",
            [createdTournamentId]
        );

        expect(result.rows).toHaveLength(1);
        expect(result.rows[0].created_by_user_id).toBe(organizer.id);
    });


    test("Should not allow creation without JWT", async () => {
        const tournamentData = buildTournament()
        const response = await request(app)
        .post("/tournaments")
        .send(tournamentData)

        expect(response.statusCode).toBe(401)
    })


    test("Should not allow creation from a player", async () => {
        const player = await createTestUser({
            role: "player"
        })

        try {
            const playerToken = createTestToken(player)
            const tournamentData = buildTournament()

            const response = await request(app)
            .post("/tournaments")
            .set("Authorization", `Bearer ${playerToken}`)
            .send(tournamentData)

            expect(response.statusCode).toBe(403)
        } finally {
            await pool.query(`
                DELETE FROM users WHERE id = $1;
            `, [player.id])
        }
    })

    test("Should reject missing tournament title", async () => {
        const tournamentData = buildTournament({
            title: ""
        });

        const response = await request(app)
            .post("/tournaments")
            .set("Authorization", `Bearer ${token}`)
            .send(tournamentData);

        expect(response.status).toBe(400);
    });


    test("Should reject end date before start date", async () => {
        const tournamentData = buildTournament({
            start_date: "2026-11-15T09:00:00",
            end_date: "2026-11-14T18:00:00"
        });

        const response = await request(app)
            .post("/tournaments")
            .set("Authorization", `Bearer ${token}`)
            .send(tournamentData);

        expect(response.status).toBe(400);
    });


    test("Should reject invalid max_players", async () => {
        const tournamentData = buildTournament({
            max_players: -5
        });

        const response = await request(app)
            .post("/tournaments")
            .set("Authorization", `Bearer ${token}`)
            .send(tournamentData);

        expect(response.status).toBe(400);
    });


    test("should reject duplicate tournaments", async () => {
        const tournamentData = buildTournament();

        
        const firstResponse = await request(app)
            .post("/tournaments")
            .set("Authorization", `Bearer ${token}`)
            .send(tournamentData);

        expect(firstResponse.status).toBe(201);

        const secondResponse = await request(app)
        .post("/tournaments")
        .set("Authorization", `Bearer ${token}`)
        .send(tournamentData);

        expect(secondResponse.status).toBe(409);

        const result = await pool.query(
            `SELECT id
            FROM tournaments
            WHERE created_by_user_id = $1
            AND title = $2
            AND location = $3
            AND start_date = $4`,
            [
                organizer.id,
                tournamentData.title,
                tournamentData.location,
                tournamentData.start_date
            ]
        );

        expect(result.rows).toHaveLength(1);
    })


    test("Should reject duplicate tournament regardless of case and spaces", async () => {
        // Arrange
        const tournamentData = buildTournament({
            title: "UW Tennis Open",
            location: "Seattle"
        });

        // First request: create tournament
        const firstResponse = await request(app)
            .post("/tournaments")
            .set("Authorization", `Bearer ${token}`)
            .send(tournamentData);

        expect(firstResponse.status).toBe(201);

        // Second request: same identity, different formatting
        const duplicateData = {
            ...tournamentData,
            title: "  uw tennis open  ",
            location: "  SEATTLE  "
        };

        const secondResponse = await request(app)
            .post("/tournaments")
            .set("Authorization", `Bearer ${token}`)
            .send(duplicateData);

        expect(secondResponse.status).toBe(409);

        // Verify that only one tournament was inserted
        const result = await pool.query(
            `SELECT id
            FROM tournaments
            WHERE created_by_user_id = $1
            AND LOWER(TRIM(title)) = LOWER(TRIM($2))
            AND LOWER(TRIM(location)) = LOWER(TRIM($3))
            AND start_date = $4`,
            [
                organizer.id,
                tournamentData.title,
                tournamentData.location,
                tournamentData.start_date
            ]
        );

        expect(result.rows).toHaveLength(1);
    });

})


describe("/PATCH tournament", () => {
    let organizer;
    let tournament;
    let token;

    beforeEach(async () => {
        organizer = undefined;
        tournament = undefined;

        organizer = await createTestUser({
            role: "organizer"
        });

        token = createTestToken(organizer);

        tournament = await createTournament(
            organizer.id
        );
    });

    afterEach(async () => {
        if (organizer?.id != null) {
            await pool.query(
                `DELETE FROM tournaments
                 WHERE created_by_user_id = $1`,
                [organizer.id]
            );

            await pool.query(
                "DELETE FROM users WHERE id = $1",
                [organizer.id]
            );
        }
    });


    test("Should allow organizer to update own tournament", async () => {
        // Arrange: Fields we want to update
        const updates = {
            title: "Updated Tennis Open",
            max_players: 32
        };

        // Act: Send PATCH request
        const response = await request(app)
            .patch(`/tournaments/${tournament.id}`)
            .set("Authorization", `Bearer ${token}`)
            .send(updates);

        // Assert: Correct status
        expect(response.status).toBe(200);

        // Assert: Verify database was updated
        const result = await pool.query(
            "SELECT * FROM tournaments WHERE id = $1",
            [tournament.id]
        );

        expect(result.rows).toHaveLength(1);
        expect(result.rows[0].title).toBe("Updated Tennis Open");
        expect(result.rows[0].max_players).toBe(32);

        // Verify fields we didn't update remain unchanged
        expect(result.rows[0].location).toBe(tournament.location);
    });

})


afterAll(async () => {
    await pool.end();
});