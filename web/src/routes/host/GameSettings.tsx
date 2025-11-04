import { useRequireHost } from "../../hooks/useHostAuth";

const GameSettings = () => {
  const loading = useRequireHost();
  if (loading) {
    return <div className="app-shell">Checking permissions...</div>;
  }
  return (
    <div className="app-shell stack">
      <h1>Game Settings</h1>
      <p>TODO: Configure categories, timers, and scoring tweaks.</p>
    </div>
  );
};

export default GameSettings;
