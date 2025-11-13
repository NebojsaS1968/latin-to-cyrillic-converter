const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const mammoth = require("mammoth");
const morgan = require("morgan");
const { Worker } = require("worker_threads");

const app = express();
app.use(morgan("dev"));
app.set("view engine", "pug");
app.set("views", path.join(__dirname, "views"));
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.get("/", (req, res) => {
  res.render("index");
});

const upload = multer({ dest: "uploads/" });
app.post("/upload", upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).send("Nijedan fajl nije otpremljen");

  const filePath = req.file.path;
  const fileExt = req.file.originalname.split(".").pop().toLowerCase();
  const originalName = req.file.originalname;

  const worker = new Worker(path.join(__dirname, "workers/upload-worker.js"), {
    workerData: { filePath, fileExt, originalName },
  });

  worker.on("message", (msg) => {
    if (msg.success) {
      res.download(msg.filePath, () => fs.unlinkSync(msg.filePath));
    } else {
      res.status(400).send(msg.error || "Konverzija neuspešna");
    }
  });

  worker.on("error", (err) => {
    console.error("Worker error:", err);
    res.status(500).send("Interna greška na severu");
  });

  worker.on("exit", (code) => {
    if (code !== 0) console.error(`Worker stopped with exit code ${code}`);
  });
});

app.post("/convert-text", async (req, res) => {
  const { text, direction } = req.body;

  if (!text || !direction) {
    return res.status(200).json({ message: "Tekst za konverziju ne postoji" });
  }

  const worker = new Worker(
    path.join(__dirname, "workers/convert-text-worker.js"),
    {
      workerData: { text, direction },
    }
  );

  worker.on("message", (msg) => {
    if (msg.success) {
      return res.status(200).json({ convertedText: msg.convertedText });
    } else {
      return res.status(400).send(msg.error || "Konverzija neuspešna");
    }
  });

  worker.on("error", (err) => {
    console.error("Worker error:", err);
    res.status(500).send("Interna greška na severu");
  });

  worker.on("exit", (code) => {
    if (code !== 0) console.error(`Worker stopped with exit code ${code}`);
  });
});

app.listen(3000, () => console.log("Server running on port 3000"));
