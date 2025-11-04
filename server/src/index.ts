import "dotenv/config";
import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";
import session from "express-session";
import { createServer } from "node:http";
import { Server } from "socket.io";
import { hostRouter } from "./routes/host.js";
import { playerRouter } from "./routes/player.js";
import { registerSocketHandlers } from "./sockets.js";

const PORT = Number(process.env.PORT || 4000);
const BASE_URL = process.env.BASE_URL || "http://localhost:5173";
const SESSION_SECRET = process.env.SESSION_SECRET || "der-grosse-preis-session";

const app = express();

const sessionMiddleware = session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,
    sameSite: "lax"
  }
});

app.use(
  cors({
    origin: BASE_URL,
    credentials: true
  })
);
app.use(express.json());
app.use(sessionMiddleware);

app.use("/api/host", hostRouter);
app.use("/api/player", playerRouter);

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: BASE_URL,
    credentials: true
  }
});

io.use((socket, next) => {
  sessionMiddleware(socket.request as Request, {} as Response, next as NextFunction);
});

registerSocketHandlers(io);

httpServer.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
