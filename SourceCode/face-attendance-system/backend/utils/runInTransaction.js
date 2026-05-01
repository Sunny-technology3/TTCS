const mongoose = require("mongoose");

const runInTransaction = async (work, mongooseLib = mongoose) => {
    const session = await mongooseLib.startSession();

    try {
        let result;

        await session.withTransaction(async () => {
            result = await work(session);
        });

        return result;
    } finally {
        await session.endSession();
    }
};

module.exports = { runInTransaction };
