const ExcelJS = require("exceljs");

const formatSessionDate = (value) => {
    if (!value) return "";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "";

    const pad = (n) => String(n).padStart(2, "0");

    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
};

const STATUS_LABEL = {
    present: "Có mặt",
    late: "Đi muộn",
    absent: "Vắng mặt",
};

const buildClassAttendanceWorkbook = async ({
    classData,
    sessions,
    students,
    attendanceMap,
}) => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Kết quả điểm danh");

    const totalCols = 3 + sessions.length + 4;

    worksheet.getColumn(1).width = 5;
    worksheet.getColumn(2).width = 15;
    worksheet.getColumn(3).width = 20;

    for (let i = 0; i < sessions.length; i++) {
        worksheet.getColumn(4 + i).width = 13;
    }

    worksheet.getColumn(4 + sessions.length).width = 8;
    worksheet.getColumn(5 + sessions.length).width = 8;
    worksheet.getColumn(6 + sessions.length).width = 8;
    worksheet.getColumn(7 + sessions.length).width = 10;

    worksheet.mergeCells(1, 1, 1, totalCols);

    const titleCell = worksheet.getCell(1, 1);

    titleCell.value = `KẾT QUẢ ĐIỂM DANH - ${classData.name.toUpperCase()}`;

    titleCell.font = { bold: true, size: 13 };

    titleCell.alignment = {
        horizontal: "center",
        vertical: "middle",
    };

    worksheet.addRow([]);

    worksheet.mergeCells(3, 1, 3, 3);

    const summaryCell = worksheet.getCell(3, 1);

    summaryCell.value = `Danh sách gồm ${students.length} sinh viên`;
    summaryCell.font = { italic: true };
    summaryCell.alignment = { horizontal: "left" };

    worksheet.addRow([
        "STT",
        "Mã sinh viên",
        "Họ và tên",
        ...sessions.map(s => formatSessionDate(s.startTime)),
        "Có mặt",
        "Đi muộn",
        "Vắng",
        "Tổng buổi",
    ]);

    const headerRow = worksheet.getRow(4);

    headerRow.font = {
        bold: true,
    };

    headerRow.alignment = {
        horizontal: "center",
        vertical: "middle",
    };

    students.forEach((student, index) => {
        const row = [
            index + 1,
            student.studentId,
            student.fullName,
        ];

        let present = 0;
        let late = 0;
        let absent = 0;

        sessions.forEach(session => {
            const key = `${student._id}_${session._id}`;
            const att = attendanceMap.get(key);

            const status = att?.status || "absent";

            row.push(STATUS_LABEL[status]);

            if (status === "present") present++;
            else if (status === "late") late++;
            else absent++;
        });

        row.push(present, late, absent, sessions.length);

        worksheet.addRow(row);
    });

    worksheet.eachRow((row, rowNumber) => {
        if (rowNumber <= 3) return;

        row.eachCell((cell) => {
            cell.border = {
                top: { style: "thin" },
                left: { style: "thin" },
                bottom: { style: "thin" },
                right: { style: "thin" },
            };

            cell.alignment = {
                vertical: "middle",
                horizontal: "center",
                wrapText: true,
            };
        });
    });

    worksheet.eachRow((row, rowNumber) => {
        if (rowNumber <= 4) return;

        row.eachCell((cell) => {
            cell.font = {
                name: "Times New Roman",
                size: 12,
            };
        });
    });

    return workbook;
};

module.exports = {
    buildClassAttendanceWorkbook,
};