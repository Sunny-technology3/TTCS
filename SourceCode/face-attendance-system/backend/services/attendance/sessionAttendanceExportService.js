const AppError = require("../../utils/appError");
const fs = require("fs");
const path = require("path");
const ExcelJS = require("exceljs");

const ATTENDANCE_STATUS_LABELS = {
    present: "Có mặt",
    late: "Đi muộn",
    absent: "Vắng mặt",
};

const DEFAULT_START_ROW = 5;

const formatCheckIn = (value) => {
    if (!value) {
        return "---";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "---";
    }

    const pad = (number) => String(number).padStart(2, "0");

    return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const formatSessionDate = (value) => {
    if (!value) {
        return "---";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "---";
    }

    const pad = (number) => String(number).padStart(2, "0");

    return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
};

const normalizeTemplateHeadingText = (value) => String(value || "").trim().toUpperCase();

const fillAttendanceWorksheet = ({
    worksheet,
    rows,
    studentCount,
    className = "",
    sessionName = "",
    sessionDateText = "",
    startRow = DEFAULT_START_ROW,
}) => {
    const sessionHeaderCell = worksheet.getCell(1, 1);
    const normalizedClassName = normalizeTemplateHeadingText(className);
    const normalizedSessionName = normalizeTemplateHeadingText(sessionName);

    if (typeof sessionHeaderCell.value === "string") {
        sessionHeaderCell.value = sessionHeaderCell.value
            .replaceAll("{className}", normalizedClassName)
            .replaceAll("{sessionName}", normalizedSessionName)
            .replaceAll("{sessionDate}", sessionDateText);
    }

    const summaryCell = worksheet.getCell(3, 1);

    summaryCell.value = `Danh sách gồm ${studentCount} sinh viên`;
    summaryCell.font = { italic: true };
    summaryCell.alignment = {
        ...(summaryCell.alignment || {}),
        horizontal: "left",
    };

    rows.forEach((row, index) => {
        const worksheetRow = startRow + index;

        worksheet.getCell(worksheetRow, 1).value = row.index;
        worksheet.getCell(worksheetRow, 2).value = row.studentId;
        worksheet.getCell(worksheetRow, 3).value = row.fullName;
        worksheet.getCell(worksheetRow, 4).value = row.checkInText;
        worksheet.getCell(worksheetRow, 5).value = row.statusText;
    });
};

const buildSessionAttendanceWorkbook = async (attendanceData) => {
    const templatePath = path.join(
        __dirname,
        "..",
        "..",
        "templates",
        "attendance-template.xlsx"
    );

    if (!fs.existsSync(templatePath)) {
        throw new AppError(500, "Không tìm thấy file template");
    }

    const workbook = new ExcelJS.Workbook();

    await workbook.xlsx.readFile(templatePath);

    const worksheet = workbook.worksheets[0];

    if (!worksheet) {
        throw new AppError(500, "Worksheet không hợp lệ");
    }

    fillAttendanceWorksheet({
        worksheet,
        rows: attendanceData.rows,
        studentCount: attendanceData.studentCount,
        className: attendanceData.classData?.name || "",
        sessionName: attendanceData.session.name || "",
        sessionDateText: formatSessionDate(
            attendanceData.session.startTime
        ),
    });

    return workbook;
};

module.exports = {
    buildSessionAttendanceWorkbook,
};
