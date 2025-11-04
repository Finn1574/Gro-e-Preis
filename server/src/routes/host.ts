import { randomUUID } from "node:crypto";
import { Router } from "express";
import { requireHost } from "../middleware/auth.js";
import { getQuestionById } from "../questions.js";
import { createGame, findQuestionGame, getGame } from "../state.js";

const HOST_PASSWORD = process.env.HOST_PASSWORD || "007";

export const hostRouter = Router();

hostRouter.post("/login", (req, res) => {
  const { password } = req.body as { password?: string };
  if (!password || password !== HOST_PASSWORD) {
    return res.status(401).json({ error: "Invalid password" });
  }

  const hostSessionId = randomUUID();
  req.session.role = "host";
  req.session.hostSessionId = hostSessionId;
  req.session.save((err) => {
    if (err) {
      return res.status(500).json({ error: "Failed to establish session" });
    }
    return res.json({ ok: true });
  });
});

hostRouter.post("/logout", requireHost, (req, res) => {
  req.session.destroy(() => {
    res.json({ ok: true });
  });
});

hostRouter.get("/session", (req, res) => {
  if (req.session.role === "host" && req.session.hostSessionId) {
    return res.json({ role: "host" });
  }
  return res.status(401).json({ error: "Not authenticated" });
});

hostRouter.post("/game", requireHost, (req, res) => {
  const hostSessionId = req.session.hostSessionId!;
  const game = createGame(hostSessionId);
  req.session.hostGameId = game.id;
  req.session.save(() => {
    // best-effort persist
  });
  return res.json({ gameId: game.id });
});

hostRouter.get("/board/:gameId", requireHost, (req, res) => {
  const { gameId } = req.params;
  const game = getGame(gameId);
  if (!game) {
    return res.status(404).json({ error: "Game not found" });
  }
  if (game.hostSessionId !== req.session.hostSessionId) {
    return res.status(403).json({ error: "Access denied" });
  }

  const board = Object.values(game.board).map((cell) => ({
    qid: cell.qid,
    points: cell.points,
    status: cell.status,
    index: cell.index
  }));

  return res.json({
    gameId: game.id,
    board
  });
});

hostRouter.get("/question/:qid", requireHost, (req, res) => {
  const { qid } = req.params;
  const game = findQuestionGame(qid);
  if (!game) {
    return res.status(404).json({ error: "Question not found" });
  }
  if (game.hostSessionId !== req.session.hostSessionId) {
    return res.status(403).json({ error: "Access denied" });
  }

  const question = getQuestionById(qid);
  if (!question) {
    return res.status(404).json({ error: "Question not found" });
  }

  return res.json({
    qid: question.id,
    prompt: question.prompt,
    options: question.options,
    answer: question.answer,
    points: question.points
  });
});

hostRouter.post("/question/:qid/submit", requireHost, (req, res) => {
  const { qid } = req.params;
  const { choice } = req.body as { choice?: string };
  const game = findQuestionGame(qid);
  if (!game) {
    return res.status(404).json({ error: "Question not found" });
  }
  if (game.hostSessionId !== req.session.hostSessionId) {
    return res.status(403).json({ error: "Access denied" });
  }
  const question = getQuestionById(qid);
  if (!question) {
    return res.status(404).json({ error: "Question not found" });
  }
  if (!choice || !["A", "B", "C", "D"].includes(choice)) {
    return res.status(400).json({ error: "Choice must be one of A, B, C, D" });
  }
  const correct = question.answer === choice;
  return res.json({ correct, answer: question.answer });
});
