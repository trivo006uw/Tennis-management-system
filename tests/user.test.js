
const request = require("supertest");
const app = require("../src/app")
const pool = require("../config/db")

describe("Post user/register", () =>{
    const testEmail = "integration-test@gmail.com";
    const testUsername = "integrationTestUser";

    const testUser = {
        name: "Test User",
        username: testUsername,
        email: testEmail,
        password: "Password123!"
    };

    //Precheck that we are using test db, and clear old test user
    beforeAll(async () => {
        const result = await pool.query(`
            SELECT current_database() AS name
        `)

        if (result.rows[0].name !== "tennis_test") {
            throw new Error("Refusing to modify non-test database");
        }

        await pool.query(`
            DELETE FROM users
            WHERE email = $1 AND 
            username = $2;
        `, [testEmail, testUsername])
    })

    // Reset the test user's state before every test
    beforeEach(async () => {
        await pool.query(
            "DELETE FROM users WHERE email = $1 OR username = $2",
            [testEmail, testUsername]
        );
    });


    test("Should register a new user", async () => {
        const response = await request(app)
            .post("/users/register")
            .send(testUser);

        expect(response.status).toBe(201);
        expect(response.body.user.email).toBe(testEmail);
        expect(response.body.user.username).toBe(testUsername);
        expect(response.body.user.role).toBe("player");

        expect(response.body.user).not.toHaveProperty(
            "password_hash"
        );

        const userResult = await pool.query(
            "SELECT id, email FROM users WHERE email = $1",
            [testEmail]
        );

        expect(userResult.rows).toHaveLength(1);
        expect(userResult.rows[0].email).toBe(testEmail);
    });


    test("Should reject duplicate email", async () => {
        // Arrange: Create existing user
        await request(app)
            .post("/users/register")
            .send(testUser)
            .expect(201);

        // Act: Attempt to register the same email
        const response = await request(app)
            .post("/users/register")
            .send({
                ...testUser,
                username: "anotherTestUser"
            });

        // Assert
        expect(response.status).toBe(409);
        expect(response.body.message).toBe(
            "Email already exists"
        );
    });


   test("Should reject duplicate username", async () => {
        // Arrange: Create existing user
        await request(app)
            .post("/users/register")
            .send(testUser)
            .expect(201);

        // Act: Attempt to register the same username
        const response = await request(app)
            .post("/users/register")
            .send({
                ...testUser,
                email: "another-integration-test@gmail.com"
            });

        // Assert
        expect(response.status).toBe(409);
        expect(response.body.message).toBe(
            "Username already exists"
        );
    });


    test("Should reject an invalid email", async () => {
        // Arrange + Act
        const response = await request(app)
            .post("/users/register")
            .send({
                ...testUser,
                email: "notanemail"
            });

        // Assert
        expect(response.status).toBe(400);
        expect(response.body.message).toBe("Invalid email format");
    });


    test("Should reject a weak password", async () => {
        const response = await request(app)
            .post("/users/register")
            .send({
                ...testUser,
                password: "123"
            });

        expect(response.status).toBe(400);
        expect(response.body.message).toBe(
            "Password must be at least 8 characters"
        );
    });


    test("Should reject an invalid username", async () => {
        const response = await request(app)
            .post("/users/register")
            .send({
                ...testUser,
                username: "ab"
            });

        expect(response.status).toBe(400);
        expect(response.body.message).toBe(
            "Username must be 3-30 characters"
        );
    });


    test("Should reject missing required fields", async () => {
        const { email, ...incompleteUser } = testUser;

        const response = await request(app)
            .post("/users/register")
            .send(incompleteUser);

        expect(response.status).toBe(400);
        expect(response.body.message).toBe(
            "All fields are required"
        );
    });
    

    test("Should reject invalid input types", async () => {
        const response = await request(app)
            .post("/users/register")
            .send({
                ...testUser,
                username: 12345
            });

        expect(response.status).toBe(400);
        expect(response.body.message).toBe(
            "Invalid input types"
        );
    });

     // Clean up after the suite
    afterAll(async () => {
        await pool.query(
            "DELETE FROM users WHERE email = $1 OR username = $2",
            [testEmail, testUser]
        );

        await pool.end();
    });
})