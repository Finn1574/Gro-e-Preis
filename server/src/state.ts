import { randomUUID } from "node:crypto";
import { buildBoard, selectQuestionsForGame } from "./questions.js";
import { BoardStatus, Game } from "./types.js";

const games = new Map<string, Game>();

export const createGame = (hostSessionId: string): Game => {
  const id = randomUUID().slice(0, 8);
  const questions = selectQuestionsForGame(id, 25);
  const board = buildBoard(questions);
  const game: Game = {
    id,
    hostSessionId,
    players: {},
    questions,
    board
  };
  games.set(id, game);
  return game;
};

export const getGame = (gameId: string): Game | undefined => games.get(gameId);

export const upsertGame = (game: Game): void => {
  games.set(game.id, game);
};

export const findQuestionGame = (qid: string): Game | undefined => {
  for (const game of games.values()) {
    if (game.board[qid]) {
      return game;
    }
  }
  return undefined;
};

export const markBoardStatus = (game: Game, qid: string, status: BoardStatus): Game => {
  const cell = game.board[qid];
  if (cell) {
    cell.status = status;
  }
  return game;
};

export const removeGame = (gameId: string): void => {
  games.delete(gameId);
};

export const listGames = (): Game[] => Array.from(games.values());
