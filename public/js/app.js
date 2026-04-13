const questions = [
  {
    question: "What is an ecosystem?",
    choices: [
      "All  individuals living in an area",
      "Living organism  interacting with each other",
      "Interaction of biotic and abiotic components in an environment",
      "The distribution of one species in a habitat"
    ],
    correct: "C",
    video: "/assets/videos/q1.mp4"
  },
  {
    question: "Nemo lives in a single coral reef where clownfish only breed and interact within their own group, with no movement to other reefs. What type of population does this represent?",
    choices: ["Open population", "Closed population", "Random population", "Mixed population"],
    correct: "B",
    video: "/assets/videos/q2.mp4"
  },
  {
    question: "In The Lion King, after Scar takes over the Pride Lands, food resources become scarce. Both lions and hyenas begin aggressively competing for the same limited prey such as zebras and wildebeests. What ecological principle is being demonstrated?",
    choices: ["Mutualism breakdown", "Competition", "Parasitism", "Species in richness increase"],
    correct: "B",
    video: "assets/videos/q4.mp4"
  },
  {
    question: "Marlin the clownfish live among sea anemones, gaining protection while the anemones are generally unaffected. What type of interaction is this?",
    choices: ["Mutualism", "Parasitism", "Commnesalism", "Competition"],
    correct: "C",
    video: "assets/videos/q3.mp4"
  },
  {
    question: "In Bikini Bottom, pollution from the Krusty Krab causes a decline in plankton populations. This affects fish that rely on plankton as food. What is the direct ecological impact?",
    choices: [" Decreased primary production in the food chain", "Increased mutualism", "Abiotic independence of organisms", "Random population stabilization"],
    correct: "A",
    video: "assets/videos/q5.mp4"
  },
];

const fallbackVideo = "/assets/videos/Habitats_ Rainforests [CLIP].mp4";

const entryScreen = document.getElementById("entry-screen");
const quizScreen = document.getElementById("quiz-screen");
const summaryScreen = document.getElementById("summary-screen");
const resultScreen = document.getElementById("result-screen");
const nameInput = document.getElementById("name-input");
const emailInput = document.getElementById("email-input");
const sectionInput = document.getElementById("section-input");
const startBtn = document.getElementById("start-btn");
const questionTitle = document.getElementById("question-title");
const choicesEl = document.getElementById("choices");
const questionIndexEl = document.getElementById("question-index");
const resultStudent = document.getElementById("result-student");
const resultScore = document.getElementById("result-score");
const resultBreakdown = document.getElementById("result-breakdown");
const restartBtn = document.getElementById("restart-btn");
const studentNameLabel = document.getElementById("student-name-label");
const backBtn = document.getElementById("back-btn");
const nextBtn = document.getElementById("next-btn");
const summaryBreakdown = document.getElementById("summary-breakdown");
const summaryBackBtn = document.getElementById("summary-back-btn");
const submitBtn = document.getElementById("submit-btn");
const bgVideo = document.getElementById("bg-video");
const bgAudio = document.getElementById("bg-audio");

let currentIndex = 0;
let studentName = "";
let studentEmail = "";
let studentSection = "";
let selectedAnswers = [];
let answers = [];

function letterFor(index) {
  return String.fromCharCode(65 + index);
}

function switchScreen(show) {
  [entryScreen, quizScreen, summaryScreen, resultScreen].forEach((el) => el.classList.add("hidden"));
  show.classList.remove("hidden");
}

function normalizeVideoPath(path) {
  if (!path) return fallbackVideo;
  if (path.startsWith("/")) return path;
  return `/${path.replace(/\\/g, "/")}`;
}

function renderQuestion() {
  const item = questions[currentIndex];
  questionTitle.textContent = item.question;
  questionIndexEl.textContent = `Question ${currentIndex + 1} of ${questions.length}`;
  bgVideo.onerror = () => {
    if (bgVideo.src.includes(fallbackVideo)) return;
    bgVideo.src = fallbackVideo;
    bgVideo.load();
    bgVideo.play().catch(() => {});
  };
  bgVideo.src = normalizeVideoPath(item.video);
  bgVideo.load();
  bgVideo.play().catch(() => {});

  choicesEl.innerHTML = "";
  item.choices.forEach((choice, idx) => {
    const letter = letterFor(idx);
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = `${letter}. ${choice}`;
    if (selectedAnswers[currentIndex] === letter) {
      button.classList.add("selected-choice");
    }
    button.addEventListener("click", () => {
      selectedAnswers[currentIndex] = letter;
      renderQuestion();
    });
    choicesEl.appendChild(button);
  });
  backBtn.disabled = currentIndex === 0;
  nextBtn.textContent = currentIndex === questions.length - 1 ? "Review Answers" : "Next";
}

function goBackQuestion() {
  if (currentIndex === 0) return;
  currentIndex -= 1;
  renderQuestion();
}

function goNextQuestion() {
  if (!selectedAnswers[currentIndex]) {
    selectedAnswers[currentIndex] = "No Answer";
  }
  if (currentIndex === questions.length - 1) {
    renderSummary();
    switchScreen(summaryScreen);
    return;
  }
  currentIndex += 1;
  renderQuestion();
}

function buildAnswersFromSelections() {
  answers = questions.map((item, index) => {
    const selected = selectedAnswers[index] || "No Answer";
    const isCorrect = selected === item.correct;
    return {
      question: index + 1,
      selected,
      correct: item.correct,
      result: selected === "No Answer" ? "No Answer" : isCorrect ? "Correct" : "Incorrect"
    };
  });
}

function renderSummary() {
  buildAnswersFromSelections();
  summaryBreakdown.innerHTML = `
    <table class="result-table">
      <thead>
        <tr>
          <th>Question</th>
          <th>Selected</th>
          <th>Correct</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        ${answers
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
  `;
}

async function finishQuiz() {
  buildAnswersFromSelections();
  const score = answers.filter((a) => a.result === "Correct").length * 2;
  const maxScore = questions.length * 2;
  const completedAt = new Date().toISOString().replace("T", " ").slice(0, 19);

  switchScreen(resultScreen);
  resultStudent.textContent = `Student: ${studentName} | Email: ${studentEmail} | Block and Section: ${studentSection}`;
  resultScore.textContent = `Score: ${score}/${maxScore}`;

  resultBreakdown.innerHTML = `
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
        ${answers
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
  `;

  try {
    await fetch("/api/results", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        studentName,
        studentEmail,
        studentSection,
        score,
        answers,
        completedAt
      })
    });
  } catch (err) {
    console.error("Failed to save result:", err);
  }
}

function startQuiz() {
  const name = nameInput.value.trim();
  const email = emailInput.value.trim();
  const section = sectionInput.value.trim();
  const namePattern = /^[A-Z\s.'-]+,\s*[A-Z\s.'-]+(?:\s+[A-Z])?$/;
  const sectionPattern = /^[A-Za-z]{2,}\s*\d+-\d+$/;

  if (!name || !email || !section) {
    alert("Please complete name, email, and block/section.");
    return;
  }
  if (!namePattern.test(name.toUpperCase())) {
    alert("Please use name format: SN, FN, MI (e.g., DELA CRUZ, JUAN P).");
    return;
  }
  if (!sectionPattern.test(section)) {
    alert("Please use block/section format like BMD 4-2.");
    return;
  }

  studentName = name.toUpperCase();
  studentEmail = email;
  studentSection = section.toUpperCase();
  sessionStorage.setItem("quizStudentIdentifier", studentName);
  studentNameLabel.textContent = `Student: ${studentName}`;
  currentIndex = 0;
  selectedAnswers = new Array(questions.length).fill(null);
  answers = [];

  switchScreen(quizScreen);
  bgAudio
    .play()
    .catch(() => {});
  renderQuestion();
}

function resetQuiz() {
  nameInput.value = "";
  emailInput.value = "";
  sectionInput.value = "";
  studentName = "";
  studentEmail = "";
  studentSection = "";
  selectedAnswers = [];
  answers = [];
  currentIndex = 0;
  switchScreen(entryScreen);
}

startBtn.addEventListener("click", startQuiz);
restartBtn.addEventListener("click", resetQuiz);
backBtn.addEventListener("click", goBackQuestion);
nextBtn.addEventListener("click", goNextQuestion);
summaryBackBtn.addEventListener("click", () => {
  currentIndex = questions.length - 1;
  switchScreen(quizScreen);
  renderQuestion();
});
submitBtn.addEventListener("click", finishQuiz);
sectionInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    startQuiz();
  }
});
