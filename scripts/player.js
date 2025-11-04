import { loadQuestions, storageKeys, listenStorage, parseJSON } from "./common.js";

const joinSection = document.querySelector('[data-step="join"]');
const waitingSection = document.querySelector('[data-step="waiting"]');
const questionSection = document.querySelector('[data-step="question"]');

const nameInput = document.querySelector('[data-player-name]');
const gameInput = document.querySelector('[data-player-game]');
const joinButton = document.querySelector('[data-join]');
const joinStatus = document.querySelector('[data-join-status]');

const activeGameLabel = document.querySelector('[data-active-game]');
const activePlayerLabel = document.querySelector('[data-active-player]');

const questionTitle = document.querySelector('[data-question-title]');
const questionPoints = document.querySelector('[data-question-points]');
const questionText = document.querySelector('[data-question-text]');
const questionOptions = document.querySelector('[data-question-options]');
const submitAnswerButton = document.querySelector('[data-submit-answer]');
const questionStatus = document.querySelector('[data-question-status]');

let questions = [];
let questionsById = new Map();
let gameId = null;
let playerName = null;
let selectedChoice = null;
let currentQuestionId = null;
let cleanupListeners = [];

function showStep(step) {
  joinSection.classList.toggle("hidden", step !== "join");
  waitingSection.classList.toggle("hidden", step !== "waiting");
  questionSection.classList.toggle("hidden", step !== "question");
}

function setStatus(element, message, isError = false) {
  element.textContent = message;
  element.style.color = isError ? "var(--danger)" : "var(--text-muted)";
}

async function ensureQuestionsLoaded() {
  if (questions.length) return;
  questions = await loadQuestions();
  questionsById = new Map(questions.map((q) => [q.id, q]));
}

function cleanup() {
  cleanupListeners.forEach((remove) => remove());
  cleanupListeners = [];
}

function attachListeners() {
  cleanup();
  if (!gameId) return;

  cleanupListeners.push(
    listenStorage(storageKeys.question(gameId), (event) => {
      const payload = parseJSON(event.newValue);
      if (payload?.qid) {
        showQuestion(payload.qid);
      }
    })
  );

  cleanupListeners.push(
    listenStorage(storageKeys.result(gameId), (event) => {
      const payload = parseJSON(event.newValue);
      if (payload?.qid) {
        handleResult(payload);
      }
    })
  );

  cleanupListeners.push(
    listenStorage(storageKeys.game(gameId), (event) => {
      if (event.newValue === null) {
        setStatus(joinStatus, "Spiel wurde beendet.");
        showStep("join");
        cleanup();
      }
    })
  );
}

async function showQuestion(qid) {
  await ensureQuestionsLoaded();
  const question = questionsById.get(qid);
  if (!question) return;
  currentQuestionId = qid;
  localStorage.removeItem(storageKeys.result(gameId));
  selectedChoice = null;
  questionTitle.textContent = question.prompt;
  questionPoints.textContent = `${question.points} Punkte`;
  questionText.textContent = "Wähle deine Antwort.";
  questionOptions.innerHTML = "";
  Object.entries(question.options).forEach(([key, value]) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = `${key}. ${value}`;
    button.dataset.choice = key;
    button.addEventListener("click", () => {
      selectedChoice = key;
      questionOptions.querySelectorAll("button").forEach((btn) => {
        btn.dataset.selected = btn.dataset.choice === key;
      });
      setStatus(questionStatus, `Auswahl: ${key}`);
    });
    questionOptions.appendChild(button);
  });
  submitAnswerButton.disabled = false;
  setStatus(questionStatus, "Bereit für die Abgabe.");
  showStep("question");
}

function handleResult({ status, by }) {
  if (!currentQuestionId) return;
  const message = status === "correct" ? "Richtig beantwortet!" : "Leider falsch.";
  setStatus(questionStatus, `${message} (${by || "Host"})`);
  submitAnswerButton.disabled = true;
  localStorage.removeItem(storageKeys.result(gameId));
  setTimeout(() => {
    showStep("waiting");
    currentQuestionId = null;
    setStatus(questionStatus, "");
  }, 2000);
}

joinButton.addEventListener("click", async () => {
  await ensureQuestionsLoaded();
  const name = nameInput.value.trim();
  const id = gameInput.value.trim().toUpperCase();
  if (!name || !id) {
    setStatus(joinStatus, "Bitte Name und Spiel-ID eingeben.", true);
    return;
  }
  const state = localStorage.getItem(storageKeys.game(id));
  if (!state) {
    setStatus(joinStatus, "Spiel nicht gefunden.", true);
    return;
  }
  playerName = name;
  gameId = id;
  sessionStorage.setItem("dgp-player", JSON.stringify({ playerName, gameId }));
  activeGameLabel.textContent = gameId;
  activePlayerLabel.textContent = playerName;
  showStep("waiting");
  setStatus(joinStatus, "Verbunden. Warte auf die erste Frage.");
  attachListeners();
  const current = parseJSON(localStorage.getItem(storageKeys.question(gameId)));
  if (current?.qid) {
    showQuestion(current.qid);
  }
});

submitAnswerButton.addEventListener("click", () => {
  if (!gameId || !playerName) {
    setStatus(questionStatus, "Keine aktive Sitzung.", true);
    return;
  }
  if (!currentQuestionId) {
    setStatus(questionStatus, "Keine Frage aktiv.", true);
    return;
  }
  if (!selectedChoice) {
    setStatus(questionStatus, "Bitte eine Antwort auswählen.", true);
    return;
  }
  submitAnswerButton.disabled = true;
  const payload = {
    qid: currentQuestionId,
    choice: selectedChoice,
    player: playerName,
    timestamp: Date.now()
  };
  localStorage.setItem(storageKeys.answer(gameId), JSON.stringify(payload));
  setStatus(questionStatus, "Antwort gesendet – warte auf Ergebnis.");
});

(async function bootstrap() {
  await ensureQuestionsLoaded();
  const params = new URLSearchParams(window.location.search);
  const urlGame = params.get("game");
  if (urlGame) {
    gameInput.value = urlGame.toUpperCase();
  }
  const session = parseJSON(sessionStorage.getItem("dgp-player"));
  if (!session) return;
  playerName = session.playerName;
  gameId = session.gameId;
  if (!gameId) return;
  nameInput.value = playerName;
  gameInput.value = gameId;
  activeGameLabel.textContent = gameId;
  activePlayerLabel.textContent = playerName;
  showStep("waiting");
  attachListeners();
  const current = parseJSON(localStorage.getItem(storageKeys.question(gameId)));
  if (current?.qid) {
    showQuestion(current.qid);
  }
})();
