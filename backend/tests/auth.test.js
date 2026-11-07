const request = require("supertest");
const app = require("../src/app");

describe("Authentication Middleware", () => {
    test("Reject request without JWT", async () => {
        const response = await request(app)
            .get("/users/me");

        expect(response.status).toBe(401);
        expect(response.body).toHaveProperty("message");
    });
}); 