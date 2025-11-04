import type { Request } from "express";
import type { Session, SessionData } from "express-session";
import { randomUUID } from "node:crypto";
import type { Server, Socket } from "socket.io";
import { getQuestionById } from "./questions.js";
import { markBoardStatus, upsertGame, createGame, getGame } from "./state.js";
import type { BoardStatus, Game } from "./types.js";

interface SessionRequest extends Request {
  session: Session & SessionData;
}

interface AuthedSocket extends Socket {
  request: SessionRequest;
}

const hostRoom = (gameId: string) => `host:${gameId}`;
const playerRoom = (gameId: string) => `game:${gameId}`;

const ensureHost = (socket: AuthedSocket): { ok: true; game?: Game } | { ok: false; message: string } => {
  const session = socket.request.session;
  if (session.role !== "host" || !session.hostSessionId) {
    return { ok: false, message: "Host session required" };
  }
  if (!session.hostGameId) {
    return { ok: true };
  }
  const game = getGame(session.hostGameId);
  if (game && game.hostSessionId === session.hostSessionId) {
    return { ok: true, game };
  }
  return { ok: true };
};

const ensurePlayer = (socket: AuthedSocket): { ok: true; game: Game; playerId: string; name: string } | { ok: false; message: string } => {
  const session = socket.request.session;
  if (session.role !== "player" || !session.playerId || !session.gameId) {
    return { ok: false, message: "Player session required" };
  }
  const game = getGame(session.gameId);
  if (!game) {
    return { ok: false, message: "Game not found" };
  }
  const player = game.players[session.playerId];
  if (!player) {
    return { ok: false, message: "Player not registered" };
  }
  return { ok: true, game, playerId: player.id, name: player.name };
};

const respond = <T>(ack: unknown, payload: T) => {
  if (typeof ack === "function") {
    (ack as (response: T) => void)(payload);
  }
};

export const registerSocketHandlers = (io: Server) => {
  io.on("connection", (rawSocket) => {
    const socket = rawSocket as AuthedSocket;
    const session = socket.request.session;

    if (session.role === "host" && session.hostGameId) {
      socket.join(hostRoom(session.hostGameId));
    }
    if (session.role === "player" && session.gameId) {
      socket.join(playerRoom(session.gameId));
    }

    socket.on("host:createGame", (_payload, ack) => {
      const sessionCheck = ensureHost(socket);
      if (!sessionCheck.ok) {
        respond(ack, { ok: false, error: sessionCheck.message });
        return;
      }
      const hostSessionId = socket.request.session.hostSessionId;
      if (!hostSessionId) {
        respond(ack, { ok: false, error: "Host session missing" });
        return;
      }
      const game = createGame(hostSessionId);
      socket.request.session.hostGameId = game.id;
      socket.request.session.save(() => {
        socket.join(hostRoom(game.id));
        respond(ack, { ok: true, gameId: game.id });
      });
    });

    socket.on("host:joinGame", (payload: { gameId: string }, ack) => {
      const sessionCheck = ensureHost(socket);
      if (!sessionCheck.ok) {
        respond(ack, { ok: false, error: sessionCheck.message });
        return;
      }
      const game = getGame(payload.gameId);
      if (!game) {
        respond(ack, { ok: false, error: "Game not found" });
        return;
      }
      if (game.hostSessionId !== socket.request.session.hostSessionId) {
        respond(ack, { ok: false, error: "Access denied" });
        return;
      }
      socket.request.session.hostGameId = game.id;
      socket.request.session.save(() => {
        socket.join(hostRoom(game.id));
        respond(ack, { ok: true });
      });
    });

    socket.on("host:selectQuestion", (payload: { gameId: string; qid: string }, ack) => {
      const { gameId, qid } = payload;
      const game = getGame(gameId);
      if (!game) {
        respond(ack, { ok: false, error: "Game not found" });
        return;
      }
      if (game.hostSessionId !== socket.request.session.hostSessionId) {
        respond(ack, { ok: false, error: "Access denied" });
        return;
      }
      const cell = game.board[qid];
      if (!cell) {
        respond(ack, { ok: false, error: "Question not on board" });
        return;
      }
      if (cell.status !== "unplayed") {
        respond(ack, { ok: false, error: "Question already completed" });
        return;
      }
      game.currentQuestionId = qid;
      upsertGame(game);
      io.to(playerRoom(gameId)).emit("player:question", { qid });
      respond(ack, { ok: true });
    });

    socket.on("player:join", (payload: { gameId: string; name: string }, ack) => {
      if (socket.request.session.role === "host") {
        respond(ack, { ok: false, error: "Hosts cannot join as player" });
        return;
      }
      const { gameId, name } = payload;
      const game = getGame(gameId);
      if (!game) {
        respond(ack, { ok: false, error: "Game not found" });
        return;
      }
      const trimmed = name.trim();
      if (!trimmed) {
        respond(ack, { ok: false, error: "Name required" });
        return;
      }
      const playerId = randomUUID();
      game.players[playerId] = {
        id: playerId,
        name: trimmed,
        score: 0
      };
      upsertGame(game);
      socket.join(playerRoom(gameId));
      socket.request.session.role = "player";
      socket.request.session.playerId = playerId;
      socket.request.session.playerName = trimmed;
      socket.request.session.gameId = gameId;
      socket.request.session.save(() => {
        respond(ack, { ok: true, playerId });
      });
    });

    socket.on(
      "player:answer",
      (payload: { gameId: string; qid: string; choice: "A" | "B" | "C" | "D" }, ack) => {
        const { gameId, qid, choice } = payload;
        const sessionCheck = ensurePlayer(socket);
        if (!sessionCheck.ok) {
          respond(ack, { ok: false, error: sessionCheck.message });
          return;
        }
        const { game, playerId, name } = sessionCheck;
        if (game.id !== gameId) {
          respond(ack, { ok: false, error: "Game mismatch" });
          return;
        }
        const cell = game.board[qid];
        if (!cell) {
          respond(ack, { ok: false, error: "Question not part of this game" });
          return;
        }
        if (cell.status !== "unplayed") {
          respond(ack, { ok: false, error: "Question already answered" });
          return;
        }
        if (game.currentQuestionId !== qid) {
          respond(ack, { ok: false, error: "Question not currently active" });
          return;
        }
        const question = getQuestionById(qid);
        if (!question) {
          respond(ack, { ok: false, error: "Question unavailable" });
          return;
        }
        const correct = question.answer === choice;
        const status: BoardStatus = correct ? "correct" : "wrong";
        markBoardStatus(game, qid, status);
        if (correct) {
          game.players[playerId].score += question.points;
        }
        game.currentQuestionId = undefined;
        upsertGame(game);
        socket.emit("player:answerResult", { qid, correct });
        io.to(hostRoom(gameId)).emit("host:answerResult", { qid, correct, playerId, name });
        io.to(hostRoom(gameId)).emit("host:boardUpdate", { qid, status });
        respond(ack, { ok: true });
      }
    );

    socket.on("disconnect", () => {
      // No-op for now; could clean up transient joins later.
    });
  });
};
