let counter = 0

function buildUser(override = {}) {
    counter ++

    return {
        name: "Test User",
        username: `testuser${counter}`,
        email: `testuser${counter}@gmail.com`,
        password: "Password123!",
        ...override
    }
}

module.exports = {buildUser}