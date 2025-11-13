const { parentPort, workerData } = require("worker_threads");
const fs = require("fs");
const mammoth = require("mammoth");
const { PDFDocument, StandardFonts } = require("pdf-lib");
const { Document, Packer, Paragraph } = require("docx");
const { convertLatinToCyrillic } = require("../converter");

(async () => {
  try {
    const { filePath, fileExt, originalName } = workerData;
    const newFilePath = `converted_${originalName}`;

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

      parentPort.postMessage({ success: true, filePath: newFilePath });
      return;
    }

    if (fileExt === "pdf") {
      const existingPdfBytes = fs.readFileSync(filePath);
      const pdfDoc = await PDFDocument.load(existingPdfBytes);
      const pages = pdfDoc.getPages();

      for (const page of pages) {
        const text = page.getTextContent ? await page.getTextContent() : ""; // Safety for malformed PDFs
        const convertedText = convertLatinToCyrillic(text);
        page.drawText(convertedText, { font: StandardFonts.Helvetica });
      }

      const pdfBytes = await pdfDoc.save();
      fs.writeFileSync(newFilePath, pdfBytes);
      fs.unlinkSync(filePath);

      parentPort.postMessage({ success: true, filePath: newFilePath });
      return;
    }

    parentPort.postMessage({ success: false, error: "Unsupported format." });
  } catch (err) {
    parentPort.postMessage({ success: false, error: err.message });
  }
})();
