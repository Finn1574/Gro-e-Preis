import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:4000";

export const socket = io(SOCKET_URL, {
  withCredentials: true,
  autoConnect: false
});

export const ensureSocketConnected = () => {
  if (!socket.connected) {
    socket.connect();
  }
};

export default socket;
