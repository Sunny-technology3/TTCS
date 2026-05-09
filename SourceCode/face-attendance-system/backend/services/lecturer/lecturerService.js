const Lecturer = require("../../models/lecturer");

const getLecturerService = async (lecturerId) => {
    const lecturer = await Lecturer.findById(lecturerId);

    return lecturer;
};

module.exports = { getLecturerService };
