import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { QRCodeCanvas } from "qrcode.react";
import { useHostGame } from "../../context/HostGameContext";
import { useRequireHost } from "../../hooks/useHostAuth";
import { buildPlayerJoinUrl } from "../../lib/api";
import { ensureSocketConnected, socket } from "../../lib/socket";

const HostStart = () => {
  const loading = useRequireHost();
  const navigate = useNavigate();
  const { gameId } = useHostGame();

  useEffect(() => {
    if (!loading && !gameId) {
      navigate("/host/dashboard", { replace: true });
    }
  }, [gameId, loading, navigate]);

  useEffect(() => {
    if (gameId) {
      ensureSocketConnected();
      socket.emit("host:joinGame", { gameId }, () => undefined);
    }
  }, [gameId]);

  if (loading || !gameId) {
    return <div className="app-shell">Preparing game...</div>;
  }

  const joinUrl = buildPlayerJoinUrl(gameId);

  return (
    <div className="app-shell stack">
      <header className="stack">
        <h1>Share the join link</h1>
        <p>Players scan the QR code or enter the URL to join this game.</p>
      </header>
      <div style={{ display: "flex", gap: "2rem", flexWrap: "wrap", alignItems: "center" }}>
        <QRCodeCanvas value={joinUrl} size={220} bgColor="#0f1423" fgColor="#5ec9ff" />
        <div className="stack">
          <p>Session code</p>
          <h2>{gameId.toUpperCase()}</h2>
          <p>Join URL</p>
          <code style={{ wordBreak: "break-all" }}>{joinUrl}</code>
        </div>
      </div>
      <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
        <button className="primary-button" onClick={() => navigate("/host/board")}>Next</button>
        <button className="secondary-button" onClick={() => navigate("/host/dashboard")}>Back to dashboard</button>
      </div>
    </div>
  );
};

export default HostStart;
