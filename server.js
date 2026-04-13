const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, "data");
const RESULTS_FILE = path.join(DATA_DIR, "results.json");
const TEACHER_USER = "teacher";
const TEACHER_PASS = "admin123";

function ensureStorage() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(RESULTS_FILE)) {
    fs.writeFileSync(RESULTS_FILE, "[]", "utf8");
  }
}

function readResults() {
  ensureStorage();
  const raw = fs.readFileSync(RESULTS_FILE, "utf8");
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeResults(results) {
  fs.writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2), "utf8");
}

function toCsv(rows) {
  const header = [
    "studentName",
    "studentEmail",
    "studentSection",
    "score",
    "completedAt",
    "question",
    "selected",
    "correct",
    "result"
  ];

  const lines = [header.join(",")];
  rows.forEach((entry) => {
    (entry.answers || []).forEach((answer) => {
      const values = [
        entry.studentName,
        entry.studentEmail,
        entry.studentSection,
        entry.score,
        entry.completedAt,
        answer.question,
        answer.selected,
        answer.correct,
        answer.result
      ].map((value) => {
        const text = String(value ?? "");
        return `"${text.replace(/"/g, '""')}"`;
      });
      lines.push(values.join(","));
    });
  });
  return lines.join("\n");
}

function getEntryDate(entry) {
  const raw = String(entry.completedAt || "").trim();
  const match = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : "";
}

app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/admin", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "admin.html"));
});

app.post("/api/results", (req, res) => {
  const payload = req.body || {};
  const studentName = String(payload.studentName || "").trim();
  const studentEmail = String(payload.studentEmail || "").trim();
  const studentSection = String(payload.studentSection || "").trim();
  const score = Number(payload.score);
  const answers = Array.isArray(payload.answers) ? payload.answers : [];
  const completedAt = String(payload.completedAt || "").trim();

  if (!studentName || !studentEmail || !studentSection || Number.isNaN(score) || !answers.length || !completedAt) {
    return res.status(400).json({ error: "Invalid submission payload." });
  }

  const newEntry = {
    studentName,
    studentEmail,
    studentSection,
    score,
    answers: answers.map((a) => ({
      question: a.question,
      selected: a.selected,
      correct: a.correct,
      result: a.result
    })),
    completedAt
  };

  const results = readResults();
  results.push(newEntry);
  writeResults(results);

  return res.status(201).json({ ok: true });
});

app.post("/api/admin/login", (req, res) => {
  const { username, password } = req.body || {};
  const ok = username === TEACHER_USER && password === TEACHER_PASS;
  return res.json({ ok });
});

app.get("/api/results", (req, res) => {
  const auth = req.headers["x-admin-auth"];
  if (auth !== "true") {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const q = String(req.query.q || "").toLowerCase().trim();
  const results = readResults();
  if (!q) {
    return res.json(results);
  }
  const filtered = results.filter((r) =>
    String(r.studentName || "").toLowerCase().includes(q)
  );
  return res.json(filtered);
});

app.get("/api/results/export.csv", (req, res) => {
  const auth = req.headers["x-admin-auth"];
  if (auth !== "true") {
    return res.status(401).send("Unauthorized");
  }
  const requestedDate = String(req.query.date || "").trim();
  const allResults = readResults();
  const rows = requestedDate
    ? allResults.filter((entry) => getEntryDate(entry) === requestedDate)
    : allResults;
  const csv = toCsv(rows);
  const fileName = requestedDate ? `quiz-results-${requestedDate}.csv` : "quiz-results.csv";
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename=${fileName}`);
  return res.send(csv);
});

ensureStorage();
app.listen(PORT, () => {
  console.log(`Quiz app running on http://localhost:${PORT}`);
});
