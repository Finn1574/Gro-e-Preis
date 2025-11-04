import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useHostGame } from "../../context/HostGameContext";
import { useRequireHost } from "../../hooks/useHostAuth";
import { apiFetch } from "../../lib/api";
import { ensureSocketConnected, socket } from "../../lib/socket";

type BoardStatus = "unplayed" | "correct" | "wrong";

interface BoardCell {
  qid: string;
  points: number;
  status: BoardStatus;
  index: number;
}

const HostBoard = () => {
  const loading = useRequireHost();
  const navigate = useNavigate();
  const { gameId } = useHostGame();
  const [board, setBoard] = useState<BoardCell[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [lastAnswer, setLastAnswer] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !gameId) {
      navigate("/host/dashboard", { replace: true });
    }
  }, [gameId, loading, navigate]);

  useEffect(() => {
    if (!gameId) {
      return;
    }
    let active = true;
    ensureSocketConnected();
    socket.emit("host:joinGame", { gameId }, () => undefined);
    apiFetch<{ board: BoardCell[] }>(`/api/host/board/${gameId}`)
      .then((data) => {
        if (active) {
          setBoard(data.board.sort((a, b) => a.index - b.index));
        }
      })
      .catch((err) => {
        setMessage(err instanceof Error ? err.message : "Failed to load board");
      });

    return () => {
      active = false;
    };
  }, [gameId]);

  useEffect(() => {
    const handleBoardUpdate = ({ qid, status }: { qid: string; status: BoardStatus }) => {
      setBoard((prev) => prev.map((cell) => (cell.qid === qid ? { ...cell, status } : cell)));
    };
    const handleAnswerResult = ({ qid, correct, name }: { qid: string; correct: boolean; name: string }) => {
      setLastAnswer(`${name} answered ${correct ? "correctly" : "incorrectly"}.`);
    };
    socket.on("host:boardUpdate", handleBoardUpdate);
    socket.on("host:answerResult", handleAnswerResult);
    return () => {
      socket.off("host:boardUpdate", handleBoardUpdate);
      socket.off("host:answerResult", handleAnswerResult);
    };
  }, []);

  if (loading || !gameId) {
    return <div className="app-shell">Loading board...</div>;
  }

  const rows = useMemo(() => {
    const sorted = [...board].sort((a, b) => a.index - b.index);
    const chunk: BoardCell[][] = [];
    for (let i = 0; i < sorted.length; i += 5) {
      chunk.push(sorted.slice(i, i + 5));
    }
    return chunk;
  }, [board]);

  const handleTileClick = (cell: BoardCell) => {
    if (cell.status !== "unplayed") {
      return;
    }
    setMessage(null);
    socket.emit("host:selectQuestion", { gameId, qid: cell.qid }, (response: { ok: boolean; error?: string }) => {
      if (!response?.ok) {
        setMessage(response?.error || "Unable to start question");
        return;
      }
      navigate(`/host/question/${cell.qid}`);
    });
  };

  return (
    <div className="app-shell stack">
      <header className="stack">
        <h1>Question Board</h1>
        <p>Pick a tile to send the question to all connected players.</p>
      </header>
      <div className="stack">
        {rows.map((row, rowIndex) => (
          <div className="grid-board" key={`row-${rowIndex}`}>
            {row.map((cell) => (
              <button
                key={cell.qid}
                className="tile"
                data-status={cell.status}
                data-disabled={cell.status !== "unplayed"}
                onClick={() => handleTileClick(cell)}
              >
                {cell.points}
              </button>
            ))}
          </div>
        ))}
      </div>
      {lastAnswer ? <div className="status-banner">{lastAnswer}</div> : null}
      {message ? <div className="status-banner">{message}</div> : null}
    </div>
  );
};

export default HostBoard;
