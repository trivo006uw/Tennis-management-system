const path = require("path");
const dotenv = require("dotenv");

const result = dotenv.config({
    path: path.resolve(__dirname, "../.env.test"),
    override: true
});

if (result.error) {
    throw result.error;
}

if (process.env.NODE_ENV !== "test") {
    throw new Error("Tests must run in test mode");
}

if (process.env.DB_NAME !== "tennis_test") {
    throw new Error("Tests must use tennis_test");
}