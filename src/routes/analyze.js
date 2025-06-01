const express = require("express");
const multer = require("multer");
const { analyzeController } = require("../controllers/analyzeController");

const router = express.Router();
const upload = multer({ dest: "temp/" });

router.post("/upload", upload.single("image"), analyzeController);
router.post("/url", analyzeController);

module.exports = router;
