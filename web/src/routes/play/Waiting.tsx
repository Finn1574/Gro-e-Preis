import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useRequirePlayer } from "../../hooks/usePlayerAuth";
import { ensureSocketConnected, socket } from "../../lib/socket";

const PlayerWaiting = () => {
  const navigate = useNavigate();
  const { loading } = useRequirePlayer();

  useEffect(() => {
    ensureSocketConnected();
    const handleQuestion = ({ qid }: { qid: string }) => {
      navigate(`/play/question/${qid}`);
    };
    socket.on("player:question", handleQuestion);
    return () => {
      socket.off("player:question", handleQuestion);
    };
  }, [navigate]);

  if (loading) {
    return <div className="app-shell">Checking player session...</div>;
  }

  return (
    <div className="app-shell stack">
      <h1>Waiting for question…</h1>
      <p>Stay ready! When the host selects a question you will see it instantly.</p>
    </div>
  );
};

export default PlayerWaiting;
