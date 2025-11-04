import type { RequestHandler } from "express";

declare module "express-session" {
  interface SessionData {
    role?: "host" | "player";
    hostSessionId?: string;
    playerId?: string;
    gameId?: string;
    playerName?: string;
    hostGameId?: string;
  }
}

export const requireHost: RequestHandler = (req, res, next) => {
  if (req.session.role === "host" && req.session.hostSessionId) {
    return next();
  }
  return res.status(401).json({ error: "Host authentication required" });
};

export const forbidHostOnPlayerRoutes: RequestHandler = (req, res, next) => {
  if (req.session.role === "host") {
    return res.status(403).json({ error: "Hosts cannot access player routes" });
  }
  return next();
};

export const ensurePlayerSession: RequestHandler = (req, res, next) => {
  if (req.session.role === "player" && req.session.playerId) {
    return next();
  }
  return res.status(401).json({ error: "Player session required" });
};
