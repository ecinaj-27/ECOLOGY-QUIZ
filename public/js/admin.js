const loginSection = document.getElementById("admin-login");
const dashboardSection = document.getElementById("admin-dashboard");
const userInput = document.getElementById("admin-user");
const passInput = document.getElementById("admin-pass");
const loginBtn = document.getElementById("admin-login-btn");
const loginError = document.getElementById("admin-login-error");
const searchInput = document.getElementById("search-input");
const listEl = document.getElementById("admin-list");
const exportBtn = document.getElementById("export-btn");

let loggedIn = false;
let lastLoadedEntries = [];

function authHeaders() {
  return { "x-admin-auth": "true" };
}

function allowOfflineLogin(username, password) {
  const normalized = String(username || "").trim().toLowerCase();
  return (normalized === "teacher" || normalized === "admin") && password === "admin123";
}

function extractDate(completedAt) {
  const raw = String(completedAt || "").trim();
  const match = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : "Unknown Date";
}

function firebaseDateToText(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (value && typeof value.toDate === "function") {
    const date = value.toDate();
    const iso = date.toISOString();
    return `${iso.slice(0, 10)} ${iso.slice(11, 19)}`;
  }
  return String(value);
}

async function loadEntriesFromFirebase(query = "") {
  if (!window.db || !window.firebaseGet || !window.firebaseCollection) {
    return null;
  }
  const snapshot = await window.firebaseGet(window.firebaseCollection(window.db, "results"));
  const entries = [];
  snapshot.forEach((doc) => {
    const data = doc.data() || {};
    entries.push({
      studentName: data.studentName || data.name || "",
      studentEmail: data.studentEmail || "",
      studentSection: data.studentSection || "",
      score: Number(data.score || 0),
      answers: Array.isArray(data.answers) ? data.answers : [],
      completedAt: data.completedAt || firebaseDateToText(data.timestamp)
    });
  });
  const q = String(query || "").toLowerCase().trim();
  if (!q) return entries;
  return entries.filter((r) => String(r.studentName || "").toLowerCase().includes(q));
}

function csvEscape(value) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function buildCsvFromEntries(entries) {
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
  entries.forEach((entry) => {
    const answers = Array.isArray(entry.answers) ? entry.answers : [];
    answers.forEach((answer) => {
      lines.push(
        [
          entry.studentName,
          entry.studentEmail,
          entry.studentSection,
          entry.score,
          entry.completedAt,
          answer.question,
          answer.selected,
          answer.correct,
          answer.result
        ]
          .map(csvEscape)
          .join(",")
      );
    });
  });
  return lines.join("\n");
}

function downloadCsvForDate(date) {
  const rows =
    date && date !== "Unknown Date"
      ? lastLoadedEntries.filter((entry) => extractDate(entry.completedAt) === date)
      : lastLoadedEntries;
  if (!rows.length) {
    alert("No results available to export.");
    return;
  }
  const csv = buildCsvFromEntries(rows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = date && date !== "Unknown Date" ? `quiz-results-${date}.csv` : "quiz-results.csv";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function renderEntries(entries) {
  if (!entries.length) {
    listEl.innerHTML = "<p>No submissions found.</p>";
    return;
  }

  const grouped = entries.reduce((acc, entry) => {
    const date = extractDate(entry.completedAt);
    if (!acc[date]) acc[date] = [];
    acc[date].push(entry);
    return acc;
  }, {});

  listEl.innerHTML = Object.keys(grouped)
    .sort((a, b) => b.localeCompare(a))
    .map((date) => {
      const dateRows = grouped[date];
      return `
        <section class="admin-date-group">
          <div class="admin-head">
            <h3>${date}</h3>
            <button class="export-date-btn" data-date="${date}">Download CSV (${dateRows.length})</button>
          </div>
          ${dateRows
            .map(
              (entry) => `
            <article class="admin-card">
              <h3>${entry.studentName} - ${entry.score}/10</h3>
              <p>Email: ${entry.studentEmail || "-"}</p>
              <p>Block and Section: ${entry.studentSection || "-"}</p>
              <p>Completed: ${entry.completedAt}</p>
              <table class="result-table">
                <thead>
                  <tr>
                    <th>Question</th>
                    <th>Selected</th>
                    <th>Correct</th>
                    <th>Result</th>
                  </tr>
                </thead>
                <tbody>
                  ${(entry.answers || [])
                    .map(
                      (a) => `
                    <tr>
                      <td>${a.question}</td>
                      <td>${a.selected}</td>
                      <td>${a.correct}</td>
                      <td>${a.result}</td>
                    </tr>
                  `
                    )
                    .join("")}
                </tbody>
              </table>
            </article>
          `
            )
            .join("")}
        </section>
      `;
    })
    .join("");
}

async function loadEntries(query = "") {
  if (!loggedIn) {
    return;
  }
  try {
    const firebaseEntries = await loadEntriesFromFirebase(query);
    if (firebaseEntries) {
      lastLoadedEntries = firebaseEntries;
      renderEntries(firebaseEntries);
      return;
    }
  } catch (_error) {
    // Fall through to existing API mode if Firebase fails.
  }

  const url = query ? `/api/results?q=${encodeURIComponent(query)}` : "/api/results";
  let response;
  try {
    response = await fetch(url, { headers: authHeaders() });
  } catch (_error) {
    listEl.innerHTML = "<p>Logged in, but server data is unavailable in this mode.</p>";
    return;
  }
  if (!response.ok) {
    listEl.innerHTML = "<p>Logged in, but server data is unavailable in this mode.</p>";
    return;
  }
  const data = await response.json();
  lastLoadedEntries = Array.isArray(data) ? data : [];
  renderEntries(data);
}

async function login() {
  loginError.textContent = "";
  const username = userInput.value.trim();
  const password = passInput.value.trim();
  if (!username || !password) {
    loginError.textContent = "Please enter username and password.";
    return;
  }

  try {
    const response = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });
    if (!response.ok && allowOfflineLogin(username, password)) {
      loggedIn = true;
      loginSection.classList.add("hidden");
      dashboardSection.classList.remove("hidden");
      loadEntries();
      return;
    }
    if (!response.ok) {
      loginError.textContent = "Login request failed. Please try again.";
      return;
    }
    const data = await response.json();
    if (!data.ok) {
      loginError.textContent = "Invalid username or password.";
      return;
    }
    loggedIn = true;
    loginSection.classList.add("hidden");
    dashboardSection.classList.remove("hidden");
    loadEntries();
  } catch (_error) {
    if (allowOfflineLogin(username, password)) {
      loggedIn = true;
      loginSection.classList.add("hidden");
      dashboardSection.classList.remove("hidden");
      loadEntries();
      return;
    }
    loginError.textContent = "Cannot reach server. Open the quiz using http://localhost:3000.";
  }
}

loginBtn.addEventListener("click", login);
userInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") login();
});
passInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") login();
});
searchInput.addEventListener("input", () => loadEntries(searchInput.value));
exportBtn.addEventListener("click", async () => {
  if (!loggedIn) return;
  await downloadCsvForDate("");
});

listEl.addEventListener("click", async (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) {
    return;
  }
  if (!target.classList.contains("export-date-btn")) {
    return;
  }
  const date = target.dataset.date || "";
  await downloadCsvForDate(date);
});
