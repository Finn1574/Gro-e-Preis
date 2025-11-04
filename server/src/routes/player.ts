import { Router } from "express";
import { ensurePlayerSession, forbidHostOnPlayerRoutes } from "../middleware/auth.js";
import { getQuestionById } from "../questions.js";
import { findQuestionGame, getGame } from "../state.js";

export const playerRouter = Router();

playerRouter.use(forbidHostOnPlayerRoutes);

playerRouter.get("/session", (req, res) => {
  if (req.session.role === "player" && req.session.playerId) {
    return res.json({ role: "player", name: req.session.playerName, gameId: req.session.gameId });
  }
  return res.status(401).json({ error: "Player not connected" });
});

playerRouter.get("/question/:qid", ensurePlayerSession, (req, res) => {
  const { qid } = req.params;
  const question = getQuestionById(qid);
  if (!question) {
    return res.status(404).json({ error: "Question not found" });
  }

  const game = findQuestionGame(qid);
  if (!game || game.id !== req.session.gameId) {
    return res.status(403).json({ error: "Access denied" });
  }

  return res.json({
    qid: question.id,
    prompt: question.prompt,
    options: question.options,
    points: question.points
  });
});

playerRouter.get("/board/:gameId", ensurePlayerSession, (req, res) => {
  const { gameId } = req.params;
  if (req.session.gameId !== gameId) {
    return res.status(403).json({ error: "Access denied" });
  }
  const game = getGame(gameId);
  if (!game) {
    return res.status(404).json({ error: "Game not found" });
  }
  const board = Object.values(game.board).map((cell) => ({
    qid: cell.qid,
    points: cell.points,
    status: cell.status,
    index: cell.index
  }));
  return res.json({ gameId, board });
});
