const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const mammoth = require("mammoth");
const morgan = require("morgan");
const { PDFDocument, StandardFonts } = require("pdf-lib");
const { convertLatinToCyrillic } = require("./converter");
const { Document, Packer, Paragraph } = require("docx");

const app = express();
app.use(morgan("dev"));
app.set("view engine", "pug");
app.set("views", path.join(__dirname, "views"));
app.use(express.static("public"));

app.get("/", (req, res) => {
  res.render("index");
});

const upload = multer({ dest: "uploads/" });
app.post("/upload", upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).send("No file uploaded.");

  const filePath = req.file.path;
  const fileExt = req.file.originalname.split(".").pop().toLowerCase();
  const newFilePath = `converted_${req.file.originalname}`;

  if (fileExt === "docx") {
    const buffer = fs.readFileSync(filePath);
    const { value } = await mammoth.extractRawText({ buffer });
    const convertedText = convertLatinToCyrillic(value);

    const doc = new Document({
      sections: [
        {
          children: [new Paragraph(convertedText)],
        },
      ],
    });

    const docBuffer = await Packer.toBuffer(doc);
    fs.writeFileSync(newFilePath, docBuffer);
    fs.unlinkSync(filePath);

    return res.download(newFilePath, () => fs.unlinkSync(newFilePath));
  }

  if (fileExt === "pdf") {
    const existingPdfBytes = fs.readFileSync(filePath);
    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    const pages = pdfDoc.getPages();

    pages.forEach((page) => {
      const text = page.getTextContent();
      const convertedText = convertLatinToCyrillic(text);
      page.drawText(convertedText, { font: StandardFonts.Helvetica });
    });

    const pdfBytes = await pdfDoc.save();
    fs.writeFileSync(newFilePath, pdfBytes);
    fs.unlinkSync(filePath);

    return res.download(newFilePath, () => fs.unlinkSync(newFilePath));
  }

  return res.status(400).send("Unsupported file format.");
});

app.listen(3000, () => console.log("Server running on port 3000"));
