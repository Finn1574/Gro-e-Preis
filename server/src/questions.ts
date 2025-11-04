import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { AnswerLetter, BoardCell, Game, Question } from "./types.js";

const QUESTION_SCHEMA = z.tuple([
  z.string().min(1, "Missing question id"),
  z.coerce.number().int(),
  z.string().min(1, "Missing question prompt"),
  z.string().min(1, "Missing option A"),
  z.string().min(1, "Missing option B"),
  z.string().min(1, "Missing option C"),
  z.string().min(1, "Missing option D"),
  z.enum(["A", "B", "C", "D"], {
    errorMap: () => ({ message: "Answer must be A, B, C or D" })
  })
]);

const moduleDir = fileURLToPath(new URL(".", import.meta.url));
const questionsPath = resolve(moduleDir, "../questions.txt");

let cachedQuestions: Question[] | null = null;
let questionsById: Map<string, Question> | null = null;

const createSeededRandom = (seed: string) => {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i += 1) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    const t = (h ^= h >>> 16) >>> 0;
    return t / 4294967296;
  };
};

export const loadQuestions = (): Question[] => {
  if (cachedQuestions) {
    return cachedQuestions;
  }

  const raw = readFileSync(questionsPath, "utf-8");
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length && !line.startsWith("#"));

  const parsed: Question[] = lines.map((line, index) => {
    const parts = line.split("|");
    const result = QUESTION_SCHEMA.safeParse(parts);
    if (!result.success) {
      const issues = result.error.issues.map((issue) => issue.message).join(", ");
      throw new Error(`Invalid question on line ${index + 1}: ${issues}`);
    }

    const [id, points, prompt, a, b, c, d, answer] = result.data;
    const options: Record<AnswerLetter, string> = {
      A: a,
      B: b,
      C: c,
      D: d
    };

    return {
      id,
      points,
      prompt,
      options,
      answer
    };
  });

  cachedQuestions = parsed;
  questionsById = new Map(parsed.map((q) => [q.id, q]));
  return parsed;
};

export const getQuestionById = (qid: string): Question | undefined => {
  if (!cachedQuestions) {
    loadQuestions();
  }
  return questionsById?.get(qid);
};

export const selectQuestionsForGame = (gameId: string, count = 25): Question[] => {
  const questions = loadQuestions();
  const slice = questions.slice(0, Math.max(count, 0));
  const rng = createSeededRandom(gameId);
  const shuffled = [...slice];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, count);
};

export const buildBoard = (questions: Question[]): Record<string, BoardCell> => {
  const board: Record<string, BoardCell> = {};
  questions.forEach((question, index) => {
    board[question.id] = {
      qid: question.id,
      points: question.points,
      status: "unplayed",
      index
    };
  });
  return board;
};
