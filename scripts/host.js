import { PASSWORD, loadQuestions, generateGameId, createBoard, storageKeys, writeGame, readGame, listenStorage, parseJSON, clearGame } from "./common.js";

const loginSection = document.querySelector('[data-step="login"]');
const setupSection = document.querySelector('[data-step="setup"]');
const boardSection = document.querySelector('[data-step="board"]');

const passwordInput = document.querySelector('[data-password]');
const loginButton = document.querySelector('[data-login]');
const loginHint = document.querySelector('[data-login-hint]');

const createGameButton = document.querySelector('[data-create-game]');
const gameInfo = document.querySelector('[data-game-info]');
const gameIdLabel = document.querySelector('[data-game-id]');
const gameLink = document.querySelector('[data-game-link]');
const qrImage = document.querySelector('[data-qr]');
const openBoardButton = document.querySelector('[data-open-board]');

const boardGameIdLabel = document.querySelector('[data-board-game-id]');
const boardContainer = document.querySelector('[data-board]');
const boardStatus = document.querySelector('[data-board-status]');
const currentQuestionLabel = document.querySelector('[data-current-question]');
const resetBoardButton = document.querySelector('[data-reset-board]');

const modal = document.querySelector('[data-question-modal]');
const modalTitle = document.querySelector('[data-modal-title]');
const modalPoints = document.querySelector('[data-modal-points]');
const modalText = document.querySelector('[data-modal-text]');
const modalAnswers = document.querySelector('[data-modal-answers]');
const modalMessage = document.querySelector('[data-modal-message]');
const closeModalButton = document.querySelector('[data-close-modal]');
const markCorrectButton = document.querySelector('[data-mark-correct]');
const markWrongButton = document.querySelector('[data-mark-wrong]');

let questions = [];
let questionsById = new Map();
let gameId = null;
let boardState = [];
let currentQuestionId = null;
let stopAnswerListener = null;

function showSection(step) {
  loginSection.classList.toggle("hidden", step !== "login");
  setupSection.classList.toggle("hidden", step !== "setup");
  boardSection.classList.toggle("hidden", step !== "board");
}

async function ensureQuestionsLoaded() {
  if (questions.length) return;
  questions = await loadQuestions();
  questionsById = new Map(questions.map((q) => [q.id, q]));
}

function setHint(element, message, isError = false) {
  element.textContent = message;
  element.style.color = isError ? "var(--danger)" : "var(--text-muted)";
}

function buildJoinUrl(id) {
  const { origin, pathname } = window.location;
  const basePath = pathname.replace(/[^/]+$/, "");
  return `${origin}${basePath}player.html?game=${id}`;
}

function setupStorageListeners() {
  if (stopAnswerListener) {
    stopAnswerListener();
  }
  stopAnswerListener = listenStorage(storageKeys.answer(gameId), (event) => {
    const payload = parseJSON(event.newValue);
    if (!payload || payload.qid !== currentQuestionId) return;
    handlePlayerAnswer(payload);
  });
}

function renderBoard() {
  boardContainer.innerHTML = "";
  boardState.forEach((cell) => {
    const button = document.createElement("button");
    button.className = "board__tile";
    button.type = "button";
    button.dataset.status = cell.status;
    button.dataset.disabled = cell.status !== "unplayed";
    button.dataset.qid = cell.qid;
    button.textContent = cell.points;
    if (cell.status === "unplayed") {
      button.addEventListener("click", () => openQuestion(cell.qid));
    }
    boardContainer.appendChild(button);
  });
}

function updateGameState(partial = {}) {
  const state = {
    id: gameId,
    board: boardState,
    currentQuestionId,
    updatedAt: Date.now(),
    ...partial
  };
  writeGame(gameId, state);
}

function openQuestion(qid) {
  const question = questionsById.get(qid);
  if (!question) return;
  currentQuestionId = qid;
  currentQuestionLabel.textContent = `${question.points} Punkte`;

  modalTitle.textContent = question.prompt;
  modalPoints.textContent = `${question.points} Punkte`;
  modalText.textContent = "Warte auf die Spielantwort oder markiere manuell.";
  modalMessage.textContent = "";

  modalAnswers.innerHTML = "";
  Object.entries(question.options).forEach(([key, value]) => {
    const line = document.createElement("div");
    line.textContent = `${key}. ${value}`;
    modalAnswers.appendChild(line);
  });

  modal.classList.remove("hidden");
  updateGameState();

  localStorage.removeItem(storageKeys.result(gameId));
  const questionPayload = {
    qid,
    points: question.points,
    prompt: question.prompt,
    options: question.options,
    askedAt: Date.now()
  };
  localStorage.setItem(storageKeys.question(gameId), JSON.stringify(questionPayload));
  boardStatus.textContent = `Frage ${question.points} Punkte gestartet.`;
}

function closeModal() {
  modal.classList.add("hidden");
  modalMessage.textContent = "";
}

function markBoard(qid, status, by = "Host") {
  const cell = boardState.find((item) => item.qid === qid);
  if (!cell) return;
  cell.status = status;
  currentQuestionId = null;
  currentQuestionLabel.textContent = "Keine";
  renderBoard();
  updateGameState();

  const resultPayload = { qid, status, by, timestamp: Date.now() };
  localStorage.setItem(storageKeys.result(gameId), JSON.stringify(resultPayload));
  localStorage.removeItem(storageKeys.question(gameId));
  localStorage.removeItem(storageKeys.answer(gameId));
}

function handlePlayerAnswer(payload) {
  const question = questionsById.get(payload.qid);
  if (!question) return;
  const correct = question.answer === payload.choice;
  const status = correct ? "correct" : "wrong";
  const playerName = payload.player || "Spieler";
  modalMessage.textContent = `${playerName} wählte ${payload.choice}. Antwort ist ${correct ? "richtig" : "falsch"}.`;
  boardStatus.textContent = `${playerName} beantwortete die Frage ${correct ? "richtig" : "falsch"}.`;
  markBoard(payload.qid, status, playerName);
  closeModal();
}

loginButton.addEventListener("click", async () => {
  if (passwordInput.value.trim() !== PASSWORD) {
    setHint(loginHint, "Passwort inkorrekt.", true);
    return;
  }
  await ensureQuestionsLoaded();
  passwordInput.value = "";
  setHint(loginHint, "Zugang gewährt.");
  showSection("setup");
});

createGameButton.addEventListener("click", async () => {
  await ensureQuestionsLoaded();
  gameId = generateGameId();
  boardState = createBoard(questions);
  currentQuestionId = null;
  const joinUrl = buildJoinUrl(gameId);
  gameIdLabel.textContent = gameId;
  gameLink.textContent = joinUrl;
  gameLink.href = joinUrl;
  qrImage.src = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(joinUrl)}`;
  qrImage.classList.remove("hidden");
  gameInfo.classList.remove("hidden");
  localStorage.setItem(storageKeys.activeGame, gameId);
  updateGameState();
  setupStorageListeners();
});

openBoardButton.addEventListener("click", () => {
  if (!gameId) return;
  renderBoard();
  boardGameIdLabel.textContent = gameId;
  showSection("board");
});

closeModalButton.addEventListener("click", () => {
  closeModal();
});

markCorrectButton.addEventListener("click", () => {
  if (!currentQuestionId) return;
  markBoard(currentQuestionId, "correct");
  boardStatus.textContent = "Frage als richtig markiert.";
  closeModal();
});

markWrongButton.addEventListener("click", () => {
  if (!currentQuestionId) return;
  markBoard(currentQuestionId, "wrong");
  boardStatus.textContent = "Frage als falsch markiert.";
  closeModal();
});

resetBoardButton.addEventListener("click", () => {
  if (!gameId) return;
  clearGame(gameId);
  boardState = [];
  currentQuestionId = null;
  if (stopAnswerListener) {
    stopAnswerListener();
    stopAnswerListener = null;
  }
  localStorage.removeItem(storageKeys.activeGame);
  boardContainer.innerHTML = "";
  boardStatus.textContent = "Spiel wurde zurückgesetzt.";
  showSection("setup");
});

// Wenn Host-Seite neu geladen wird, versuche aktives Spiel zu laden
(async function bootstrap() {
  await ensureQuestionsLoaded();
  const activeId = localStorage.getItem(storageKeys.activeGame);
  if (!activeId) return;
  const state = readGame(activeId);
  if (!state) return;
  gameId = activeId;
  boardState = state.board || [];
  currentQuestionId = state.currentQuestionId || null;
  if (boardState.length) {
    gameIdLabel.textContent = gameId;
    const joinUrl = buildJoinUrl(gameId);
    gameLink.textContent = joinUrl;
    gameLink.href = joinUrl;
    qrImage.src = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(joinUrl)}`;
    gameInfo.classList.remove("hidden");
    renderBoard();
    boardGameIdLabel.textContent = gameId;
    showSection("board");
    setupStorageListeners();
  }
})();
