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

function authHeaders() {
  return { "x-admin-auth": "true" };
}

function extractDate(completedAt) {
  const raw = String(completedAt || "").trim();
  const match = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : "Unknown Date";
}

async function downloadCsvForDate(date) {
  const endpoint =
    date && date !== "Unknown Date"
      ? `/api/results/export.csv?date=${encodeURIComponent(date)}`
      : "/api/results/export.csv";
  const response = await fetch(endpoint, { headers: authHeaders() });
  if (!response.ok) {
    alert("Export failed.");
    return;
  }
  const blob = await response.blob();
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
              <p>Section: ${entry.studentSection || "-"}</p>
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
  const url = query ? `/api/results?q=${encodeURIComponent(query)}` : "/api/results";
  const response = await fetch(url, { headers: authHeaders() });
  if (!response.ok) {
    listEl.innerHTML = "<p>Unable to load data.</p>";
    return;
  }
  const data = await response.json();
  renderEntries(data);
}

async function login() {
  loginError.textContent = "";
  const username = userInput.value.trim();
  const password = passInput.value.trim();

  const response = await fetch("/api/admin/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password })
  });
  const data = await response.json();
  if (!data.ok) {
    loginError.textContent = "Invalid username or password.";
    return;
  }
  loggedIn = true;
  loginSection.classList.add("hidden");
  dashboardSection.classList.remove("hidden");
  loadEntries();
}

loginBtn.addEventListener("click", login);
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
