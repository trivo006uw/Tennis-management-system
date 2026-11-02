
const pool = require("../../config/db");
const bcrypt = require("bcrypt");

const { randomUUID } = require("crypto");

function buildUser(overrides = {}) {
    const uniqueId = randomUUID().replace(/-/g, "");

    return {
        name: "Test User",
        username: `test_${uniqueId.slice(0, 20)}`,
        email: `test_${uniqueId}@example.com`,
        password: "Password123!",
        ...overrides
    };
}

async function createTestUser(overrides = {}) {
    const user = buildUser(overrides);

    const passwordHash = await bcrypt.hash(user.password, 10);
    console.log("Attempting to insert:", user.email);
    const result = await pool.query(
        `INSERT INTO users
            (name, username, email, password_hash, role)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, name, username, email, role`,
        [
            user.name,
            user.username,
            user.email,
            passwordHash,
            overrides.role ?? "player"
        ]
    );

    return result.rows[0];
}

module.exports = {
    buildUser,
    createTestUser
};
