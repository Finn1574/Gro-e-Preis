const QUESTIONS_URL = "data/questions.txt";
const QUESTIONS_CACHE = { data: null };

export const PASSWORD = "007";

export const storageKeys = {
  activeGame: "dgp-active-game",
  game: (id) => `dgp-game-${id}`,
  question: (id) => `dgp-current-${id}`,
  answer: (id) => `dgp-answer-${id}`,
  result: (id) => `dgp-result-${id}`
};

export const GAME_SIZE = 25;

export async function loadQuestions() {
  if (QUESTIONS_CACHE.data) {
    return QUESTIONS_CACHE.data;
  }
  const response = await fetch(QUESTIONS_URL);
  if (!response.ok) {
    throw new Error("Fragen konnten nicht geladen werden.");
  }
  const text = await response.text();
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"));
  const questions = lines.map((line) => {
    const [id, pointStr, prompt, a, b, c, d, answer] = line.split("|");
    return {
      id,
      points: Number(pointStr),
      prompt,
      options: { A: a, B: b, C: c, D: d },
      answer
    };
  });
  QUESTIONS_CACHE.data = questions;
  return questions;
}

export function generateGameId(length = 6) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let id = "";
  for (let i = 0; i < length; i += 1) {
    const index = Math.floor(Math.random() * alphabet.length);
    id += alphabet[index];
  }
  return id;
}

export function createBoard(questions) {
  return questions.slice(0, GAME_SIZE).map((question, index) => ({
    qid: question.id,
    points: question.points,
    status: "unplayed",
    index
  }));
}

export function readGame(gameId) {
  const raw = localStorage.getItem(storageKeys.game(gameId));
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (error) {
    console.warn("Konnte Spielzustand nicht parsen", error);
    return null;
  }
}

export function writeGame(gameId, state) {
  localStorage.setItem(storageKeys.game(gameId), JSON.stringify(state));
}

export function clearGame(gameId) {
  localStorage.removeItem(storageKeys.game(gameId));
  localStorage.removeItem(storageKeys.question(gameId));
  localStorage.removeItem(storageKeys.answer(gameId));
  localStorage.removeItem(storageKeys.result(gameId));
}

export function listenStorage(key, callback) {
  const handler = (event) => {
    if (event.key === key) {
      callback(event);
    }
  };
  window.addEventListener("storage", handler);
  return () => window.removeEventListener("storage", handler);
}

export function parseJSON(value, fallback = null) {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch (error) {
    console.warn("JSON parse error", error);
    return fallback;
  }
}
