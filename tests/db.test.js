const pool = require("../config/db");

describe("Database Configuration", () => {

    test("Connects to the test database", async () => {
        const result = await pool.query(
            "SELECT current_database() AS database_name"
        );

        expect(result.rows[0].database_name)
            .toBe("tennis_test");
    });

});

afterAll(async () => {
    await pool.end();
});