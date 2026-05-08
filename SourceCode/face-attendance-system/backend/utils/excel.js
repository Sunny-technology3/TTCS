const sendExcelWorkbook = async ({
    res,
    workbook,
    fileName,
}) => {
    const encodedFileName = encodeURIComponent(fileName);

    res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    res.setHeader(
        "Content-Disposition",
        `attachment; filename="export.xlsx"; filename*=UTF-8''${encodedFileName}`
    );

    await workbook.xlsx.write(res);

    res.end();
};

module.exports = { sendExcelWorkbook };
