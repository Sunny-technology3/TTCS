const jwt = require("jsonwebtoken");
require("dotenv").config();

function verifyToken(req, res, next) {
  const token = req.headers["authorization"];
  if (typeof token !== "undefined") {
    jwt.verify(token.split(" ")[1], process.env.secretKey, (err, decoded) => {
      if (err) {
        res.status(403).json({
          success: false,
          message: "Invalid token",
        });
      } else {
        req.user = decoded;
        next();
      }
    });
  } else {
    res.status(401).json({
      success: false,
      message: "Unauthorized",
    });
  }
}

module.exports = { verifyToken };
