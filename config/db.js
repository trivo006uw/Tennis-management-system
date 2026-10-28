console.log("this is the database")

const { Pool } = require("pg")

if (
    process.env.NODE_ENV === "test" &&
    process.env.DB_NAME !== "tennis_test"
) {
    throw new Error(
        "TEST_DATABASE_REQUIRED: Refusing to connect to a non-test database"
    );
}
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
})

module.exports = pool;
