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
    let extraUsers = [];

    //Set up by creating an organizer and tournament
    beforeEach(async () => {
        organizer = undefined;
        tournament = undefined;
        extraUsers = [];

        organizer = await createTestUser({
            role: "organizer"
        });

        token = createTestToken(organizer);

        tournament = await createTournament(
            organizer.id
        );
    });

    afterEach(async () => {
        const users = [organizer, ...extraUsers]
            .filter(user => user?.id != null);

        for (const user of users) {
            await pool.query(
                "DELETE FROM tournaments WHERE created_by_user_id = $1",
                [user.id]
            );
        }

        // Then delete users
        for (const user of users) {
            await pool.query(
                "DELETE FROM users WHERE id = $1",
                [user.id]
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


    test("Should reject organizer updating another", async () => {
        const otherOrganizer = await createTestUser({
            role: "organizer"
        })
        
        const otherOrgToken = createTestToken(otherOrganizer)
        extraUsers.push(otherOrganizer)

        const updates = {
            title: "Unauthorized Tournament Update"
        };

        const response = await request(app)
            .patch(`/tournaments/${tournament.id}`)
            .set("Authorization", `Bearer ${otherOrgToken}`)
            .send(updates)

        expect(response.status).toBe(403)
        const result = await pool.query(
            "SELECT * FROM tournaments WHERE id = $1",
            [tournament.id]
        );

        expect(result.rows).toHaveLength(1);
        expect(result.rows[0].title).toBe(tournament.title);
        expect(result.rows[0].created_by_user_id).toBe(organizer.id);
    })


    test("Should allow admin to update any tournament", async () => {
        const admin = await createTestUser({
            role: "admin"
        });

        extraUsers.push(admin);

        const adminToken = createTestToken(admin);

        const updates = {
            title: "Admin Updated Tournament"
        };

        const response = await request(app)
            .patch(`/tournaments/${tournament.id}`)
            .set("Authorization", `Bearer ${adminToken}`)
            .send(updates);

        expect(response.status).toBe(200);

        const result = await pool.query(
            "SELECT * FROM tournaments WHERE id = $1",
            [tournament.id]
        );

        expect(result.rows[0].title).toBe(updates.title);
        expect(result.rows[0].created_by_user_id).toBe(organizer.id);
    })


    test("Should reject player updating tournament", async () => {
        const player = await createTestUser({
            role: "player"
        })
        
        const playerToken = createTestToken(player)
        extraUsers.push(player)

        const updates = {
            title: "Unauthorized player Update"
        };

        const response = await request(app)
            .patch(`/tournaments/${tournament.id}`)
            .set("Authorization", `Bearer ${playerToken}`)
            .send(updates)

        expect(response.status).toBe(403)
        const result = await pool.query(
            "SELECT * FROM tournaments WHERE id = $1",
            [tournament.id]
        );

        expect(result.rows).toHaveLength(1);
        expect(result.rows[0].title).toBe(tournament.title);
        expect(result.rows[0].created_by_user_id).toBe(organizer.id);
    })


    test("Should reject invalid tournament ID", async () => {
        const updates = {
            title: "Updated Tournament"
        };

        const response = await request(app)
            .patch("/tournaments/abc")
            .set("Authorization", `Bearer ${token}`)
            .send(updates);

        expect(response.status).toBe(400);
    });


    test("Should return 404 for nonexistent tournament", async () => {
        const result = await pool.query(
            "SELECT COALESCE(MAX(id), 0) + 1 AS missing_id FROM tournaments"
        );

        const missingId = Number(result.rows[0].missing_id);

        const response = await request(app)
            .patch(`/tournaments/${missingId}`)
            .set("Authorization", `Bearer ${token}`)
            .send({
                title: "Updated Tournament"
            });

        expect(response.status).toBe(404);
    });


    test("Should reject unauthorized update fields", async () => {
        // Arrange
        const updates = {
            created_by_user_id: 999
        };

        // Act
        const response = await request(app)
            .patch(`/tournaments/${tournament.id}`)
            .set("Authorization", `Bearer ${token}`)
            .send(updates);

        // Assert
        expect(response.status).toBe(400);

        // Verify ownership has not changed
        const result = await pool.query(
            `SELECT created_by_user_id
            FROM tournaments
            WHERE id = $1`,
            [tournament.id]
        );

        expect(result.rows).toHaveLength(1);
        expect(result.rows[0].created_by_user_id).toBe(organizer.id);
    });


    test("Should reject empty tournament title", async () => {
        const updates = {
            title: ""
        };

        const response = await request(app)
            .patch(`/tournaments/${tournament.id}`)
            .set("Authorization", `Bearer ${token}`)
            .send(updates);

        expect(response.status).toBe(400);

        // Confirm the original title remains unchanged
        const result = await pool.query(
            "SELECT title FROM tournaments WHERE id = $1",
            [tournament.id]
        );

        expect(result.rows[0].title).toBe(tournament.title);
    });


    test("Should reject invalid max_players update", async () => {
        const updates = {
            max_players: -10
        };

        const response = await request(app)
            .patch(`/tournaments/${tournament.id}`)
            .set("Authorization", `Bearer ${token}`)
            .send(updates);

        expect(response.status).toBe(400);

        const result = await pool.query(
            "SELECT max_players FROM tournaments WHERE id = $1",
            [tournament.id]
        );

        expect(result.rows[0].max_players).toBe(tournament.max_players);
    });


    test("Should reject PATCH that creates duplicate tournament", async () => {
        // Tournament A already exists from beforeEach()

        // Create B with the same location and start date as A
        const secondTournament = await createTournament(
            organizer.id,
            {
                title: "Another Tennis Tournament",
                location: tournament.location,
                start_date: tournament.start_date,
                end_date: tournament.end_date
            }
        );

        // Confirm the database fixtures share the same start date
        expect(
            new Date(secondTournament.start_date).getTime()
        ).toBe(
            new Date(tournament.start_date).getTime()
        );

        // Attempt to give B the same title as A
        const response = await request(app)
            .patch(`/tournaments/${secondTournament.id}`)
            .set("Authorization", `Bearer ${token}`)
            .send({
                title: tournament.title
            });

        expect(response.status).toBe(409);

        // Ensure B was not changed
        const result = await pool.query(
            "SELECT * FROM tournaments WHERE id = $1",
            [secondTournament.id]
        );

        expect(result.rows).toHaveLength(1);
        expect(result.rows[0].title).toBe(secondTournament.title);
    });
})


describe("DELETE /tournaments/:id", () => {
    let organizer;
    let tournament;
    let token;
    let extraUsers = [];

    beforeEach(async () => {
        organizer = undefined;
        tournament = undefined;
        extraUsers = [];

        organizer = await createTestUser({
            role: "organizer"
        });

        token = createTestToken(organizer);

        tournament = await createTournament(organizer.id);
    });

    afterEach(async () => {
        const users = [organizer, ...extraUsers]
            .filter(user => user?.id != null);

        // Remove tournaments before their creators
        for (const user of users) {
            await pool.query(
                "DELETE FROM tournaments WHERE created_by_user_id = $1",
                [user.id]
            );
        }

        for (const user of users) {
            await pool.query(
                "DELETE FROM users WHERE id = $1",
                [user.id]
            );
        }
    });

    
    test("Should allow organizer to delete own tournament", async () => {
        const response = await request(app)
            .delete(`/tournaments/${tournament.id}`)
            .set("Authorization", `Bearer ${token}`);

        expect(response.status).toBe(200);

        const result = await pool.query(
            "SELECT id FROM tournaments WHERE id = $1",
            [tournament.id]
        );

        expect(result.rows).toHaveLength(0);
    });



    test("Should reject organizer deleting another organizer's tournament", async () => {
        const otherOrganizer = await createTestUser({
            role: "organizer"
        });

        extraUsers.push(otherOrganizer);
        const otherToken = createTestToken(otherOrganizer);
        const response = await request(app)
            .delete(`/tournaments/${tournament.id}`)
            .set("Authorization", `Bearer ${otherToken}`);


        expect(response.status).toBe(403);

        const result = await pool.query(
            `SELECT id, created_by_user_id
            FROM tournaments
            WHERE id = $1`,
            [tournament.id]
        );

        expect(result.rows).toHaveLength(1);
        expect(result.rows[0].created_by_user_id).toBe(
            organizer.id
        );
    });



    test("Should allow admin to delete any tournament", async () => {
        const admin = await createTestUser({
            role: "admin"
        });

        extraUsers.push(admin);
        const adminToken = createTestToken(admin);
        expect(tournament.created_by_user_id).toBe(organizer.id);

        const response = await request(app)
            .delete(`/tournaments/${tournament.id}`)
            .set("Authorization", `Bearer ${adminToken}`);
    
        expect(response.status).toBe(200);

        const result = await pool.query(
            "SELECT id FROM tournaments WHERE id = $1",
            [tournament.id]
        );

        expect(result.rows).toHaveLength(0);
    });



    test("Should reject player deleting tournament", async () => {
        const player = await createTestUser({
            role: "player"
        });

        extraUsers.push(player);

        const playerToken = createTestToken(player);

        
        const response = await request(app)
            .delete(`/tournaments/${tournament.id}`)
            .set("Authorization", `Bearer ${playerToken}`);

        // Assert: Request is forbidden
        expect(response.status).toBe(403);

        // Verify tournament still exists
        const result = await pool.query(
            `SELECT id, created_by_user_id
            FROM tournaments
            WHERE id = $1`,
            [tournament.id]
        );

        expect(result.rows).toHaveLength(1);
        expect(result.rows[0].created_by_user_id).toBe(organizer.id);
    });


    test("Should reject DELETE without JWT", async () => {
        const response = await request(app)
            .delete(`/tournaments/${tournament.id}`);

        expect(response.status).toBe(401);

        // Ensure the tournament was not deleted
        const result = await pool.query(
            "SELECT id FROM tournaments WHERE id = $1",
            [tournament.id]
        );

        expect(result.rows).toHaveLength(1);
    });



    test("Should reject DELETE with invalid tournament ID", async () => {
        const response = await request(app)
            .delete("/tournaments/abc")
            .set("Authorization", `Bearer ${token}`);

        expect(response.status).toBe(400);

        // Existing tournament should remain untouched
        const result = await pool.query(
            "SELECT id FROM tournaments WHERE id = $1",
            [tournament.id]
        );

        expect(result.rows).toHaveLength(1);
    });


    test("Should return 404 when deleting nonexistent tournament", async () => {
        const missingTournament = await createTournament(
            organizer.id
        );

        const missingId = missingTournament.id;
        await pool.query(
            "DELETE FROM tournaments WHERE id = $1",
            [missingId]
        );


        const response = await request(app)
            .delete(`/tournaments/${missingId}`)
            .set("Authorization", `Bearer ${token}`);

        expect(response.status).toBe(404);

        // Verify our original fixture still exists
        const result = await pool.query(
            "SELECT id FROM tournaments WHERE id = $1",
            [tournament.id]
        );

        expect(result.rows).toHaveLength(1);
    });

});

afterAll(async () => {
    await pool.end();
});