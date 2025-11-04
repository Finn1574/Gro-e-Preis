import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../../lib/api";
import { ensureSocketConnected } from "../../lib/socket";

const HostLogin = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await apiFetch("/api/host/login", {
        method: "POST",
        body: JSON.stringify({ password })
      });
      ensureSocketConnected();
      navigate("/host/dashboard", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-shell stack">
      <header className="stack">
        <h1>Der Große Preis &mdash; Host Login</h1>
        <p>Enter the protected access code to launch the host console.</p>
      </header>
      <form className="form-grid" onSubmit={handleSubmit}>
        <label>
          <span>Host Password</span>
          <input
            className="input"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.currentTarget.value)}
            required
            autoFocus
          />
        </label>
        <button className="primary-button" type="submit" disabled={loading}>
          {loading ? "Checking..." : "Login"}
        </button>
        {error ? <div className="status-banner">{error}</div> : null}
      </form>
    </div>
  );
};

export default HostLogin;
