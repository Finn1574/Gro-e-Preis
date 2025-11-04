import { FormEvent, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ensureSocketConnected, socket } from "../../lib/socket";

const PlayerJoin = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const gameId = params.get("gameId") || "";
  const [name, setName] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    ensureSocketConnected();
  }, []);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!gameId) {
      setStatus("Missing game link. Ask the host to share the QR code.");
      return;
    }
    const trimmed = name.trim();
    if (!trimmed) {
      setStatus("Please enter your display name.");
      return;
    }
    setLoading(true);
    setStatus(null);
    socket.emit(
      "player:join",
      { gameId, name: trimmed },
      (response: { ok: boolean; error?: string }) => {
        setLoading(false);
        if (!response?.ok) {
          setStatus(response?.error || "Unable to join game");
          return;
        }
        navigate("/play/waiting", { replace: true });
      }
    );
  };

  return (
    <div className="app-shell stack">
      <header className="stack">
        <h1>Join the Lobby</h1>
        <p>Enter your display name to join game {gameId || "?"}.</p>
      </header>
      <form className="form-grid" onSubmit={handleSubmit}>
        <label>
          <span>Display Name</span>
          <input
            className="input"
            value={name}
            onChange={(event) => setName(event.currentTarget.value)}
            placeholder="Team Blau"
            required
          />
        </label>
        <button className="primary-button" type="submit" disabled={loading}>
          {loading ? "Connecting..." : "Join"}
        </button>
      </form>
      {status ? <div className="status-banner">{status}</div> : null}
    </div>
  );
};

export default PlayerJoin;
