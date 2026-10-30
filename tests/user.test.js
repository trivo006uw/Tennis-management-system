
const request = require("supertest");
const app = require("../src/app")
const pool = require("../config/db")
const jwt = require("jsonwebtoken")

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
    });
})


describe("POST users/login", () => {
    const loginUser = {
        name: "Login Test User",
        username: "loginTestUser",
        email: "login-test@gmail.com",
        password: "Password123!"
    };

     beforeAll(async () => {
        // Confirm the actual database before making changes
        const result = await pool.query(
            "SELECT current_database() AS name"
        );

        if (result.rows[0].name !== "tennis_test") {
            throw new Error("Wrong test database");
        }
    });


    beforeEach(async () => {
        // Remove the previous fixture
        await pool.query(
            `DELETE FROM users
             WHERE email = $1 AND username = $2`,
            [loginUser.email, loginUser.username]
        );

        // Arrange: Create a user for this test
        await request(app)
            .post("/users/register")
            .send(loginUser)
            .expect(201);
    })

    test("Should login with valid credential", async () => {
        const response = await request(app)
        .post("/users/login")
        .send({
            email: "login-test@gmail.com",
            password: "Password123!"
        })

        expect(response.statusCode).toBe(200)

        // Login should return a JWT
        expect(response.body.user).toHaveProperty("token");
        expect(typeof response.body.user.token).toBe("string");

        // Confirm returned user information
        expect(response.body.user.email).toBe(loginUser.email);
        expect(response.body.user.role).toBe("player");
        expect(response.body.user).not.toHaveProperty("password_hash");

        const decoded = jwt.verify(
            response.body.user.token,
            process.env.JWT_SECRET,
            { algorithms: ["HS256"] }
        );

        expect(Number(decoded.user_id)).toBe(response.body.user.id);
        expect(decoded.role).toBe("player");
        expect(decoded.exp).toBeGreaterThan(decoded.iat);
    })


    test("Should reject incorrect password", async () => {
        const response = await request(app)
            .post("/users/login")
            .send({
                email: loginUser.email,
                password: "WrongPassword123!"
            });

        expect(response.status).toBe(401);
        expect(response.body.message).toBe("invalid credentials");
        expect(response.body).not.toHaveProperty("token");
    });


    test("Should reject nonexistent email", async () => {
        const response = await request(app)
            .post("/users/login")
            .send({
                email: "unknown-test@gmail.com",
                password: "Password123!"
            });

        expect(response.status).toBe(401);
    });

    test("Should reject missing password", async () => {
        const response = await request(app)
            .post("/users/login")
            .send({
                email: loginUser.email
            });

        expect(response.status).toBe(400);
    });

    afterAll(async () => {
        await pool.query(
            `DELETE FROM users
             WHERE email = $1 AND username = $2`,
            [loginUser.email, loginUser.username]
        );
    });
})


describe("GET /users/me", () => {
    const authUser = {
        name: "Auth Test User",
        username: "authTestUser",
        email: "auth-test@gmail.com",
        password: "Password123!"
    };

    beforeAll(async () => {
        const result = await pool.query(
            "SELECT current_database() AS name"
        );

        if (result.rows[0].name !== "tennis_test") {
            throw new Error("Wrong test database");
        }
    });

    beforeEach(async () => {
        // Remove previous test user
        await pool.query(
            `DELETE FROM users
             WHERE email = $1 OR username = $2`,
            [authUser.email, authUser.username]
        );

        // Create a fresh test user
        await request(app)
            .post("/users/register")
            .send(authUser)
            .expect(201);
    });

    test("Should retrieve authenticated user", async () => {
        // Step 1: Login
        const loginResponse = await request(app)
            .post("/users/login")
            .send({
                email: authUser.email,
                password: authUser.password
            })
            .expect(200);

        // Your login response nests the token under user
        const token = loginResponse.body.user.token;

        // Step 2: Access protected endpoint
        const response = await request(app)
            .get("/users/me")
            .set("Authorization", `Bearer ${token}`);

        // Step 3: Verify response
        expect(response.status).toBe(200);
        expect(response.body.user.username).toBe(authUser.username);
        expect(response.body.user.role).toBe("player");

        // Ensure sensitive information isn't exposed
        expect(response.body.user).not.toHaveProperty("password_hash");
    });


    test("Should reject request without JWT", async () => {
        const response = await request(app)
            .get("/users/me");

        expect(response.status).toBe(401);
    });


    test("Should reject invalid JWT", async () => {
        const response = await request(app)
            .get("/users/me")
            .set("Authorization", "Bearer invalid-token");

        expect(response.status).toBe(401);
    });


    test("Should reject expired JWT", async () => {
        const expiredToken = jwt.sign(
            {
                user_id: 1,
                role: "player"
            },
            process.env.JWT_SECRET,
            { expiresIn: -10 }
        );

        const response = await request(app)
            .get("/users/me")
            .set("Authorization", `Bearer ${expiredToken}`);

        expect(response.status).toBe(401);
    });


    test("Should reject incorrect Authorization scheme", async () => {
        // Generate a valid token with correct credentials
        const loginResponse = await request(app)
            .post("/users/login")
            .send({
                email: authUser.email,
                password: authUser.password
            })
            .expect(200);

        const token = loginResponse.body.user.token;

        // Send valid token with incorrect scheme
        const response = await request(app)
            .get("/users/me")
            .set("Authorization", `Basic ${token}`);

        expect(response.status).toBe(401);
    });


    test("Should reject JWT with invalid role", async () => {
        const invalidRoleToken = jwt.sign(
            {
                user_id: 1,
                role: "superuser"
            },
            process.env.JWT_SECRET,
            { expiresIn: "2h" }
        );

        const response = await request(app)
            .get("/users/me")
            .set("Authorization", `Bearer ${invalidRoleToken}`);

        expect(response.status).toBe(401);
        expect(response.body.message).toBe("Invalid token payload");
    });


    afterAll(async () => {
        await pool.query(
            `DELETE FROM users
             WHERE email = $1 OR username = $2`,
            [authUser.email, authUser.username]
        );
    });
});

//Final close
afterAll(async () => {
    await pool.end();
});