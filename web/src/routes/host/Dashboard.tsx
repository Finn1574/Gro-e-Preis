import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useRequireHost } from "../../hooks/useHostAuth";
import { useHostGame } from "../../context/HostGameContext";
import { ensureSocketConnected, socket } from "../../lib/socket";

const HostDashboard = () => {
  const loading = useRequireHost();
  const navigate = useNavigate();
  const { setGameId } = useHostGame();
  const [message, setMessage] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  if (loading) {
    return <div className="app-shell">Checking session...</div>;
  }

  const handleStart = () => {
    setIsCreating(true);
    setMessage(null);
    ensureSocketConnected();
    socket.emit("host:createGame", {}, (response: { ok: boolean; gameId?: string; error?: string }) => {
      if (!response?.ok || !response.gameId) {
        setMessage(response?.error || "Could not create game");
        setIsCreating(false);
        return;
      }
      setGameId(response.gameId);
      setIsCreating(false);
      navigate("/host/start");
    });
  };

  return (
    <div className="app-shell stack">
      <header className="stack">
        <h1>Host Dashboard</h1>
        <p>Launch the round, configure the game, or adjust AI helpers.</p>
      </header>
      <div className="two-column">
        <div className="stack">
          <button className="primary-button" onClick={handleStart} disabled={isCreating}>
            {isCreating ? "Creating..." : "Start Game"}
          </button>
          <button className="secondary-button" onClick={() => navigate("/host/ai")}>AI Settings</button>
          <button className="secondary-button" onClick={() => navigate("/host/settings")}>Game Settings</button>
          {message ? <div className="status-banner">{message}</div> : null}
        </div>
        <section className="status-banner">
          <strong>How it works</strong>
          <p>Use Start Game to generate a QR code for players. AI and Game settings are placeholders for future expansion.</p>
        </section>
      </div>
    </div>
  );
};

export default HostDashboard;
