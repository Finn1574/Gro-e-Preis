import { useRequireHost } from "../../hooks/useHostAuth";

const AISettings = () => {
  const loading = useRequireHost();
  if (loading) {
    return <div className="app-shell">Checking permissions...</div>;
  }
  return (
    <div className="app-shell stack">
      <h1>AI Settings</h1>
      <p>TODO: Configure AI-assisted clues and statistics. Coming soon!</p>
    </div>
  );
};

export default AISettings;
