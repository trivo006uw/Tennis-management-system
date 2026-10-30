let counter = 0;

function buildTournament(overrides = {}) {
    counter++;

    return {
        title: `Test Tournament ${counter}`,
        location: "Seattle",
        start_date: "2026-11-10T09:00:00",
        end_date: "2026-11-11T18:00:00",
        max_players: 16,
        ...overrides
    };
}

module.exports = { buildTournament };