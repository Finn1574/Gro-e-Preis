import { FormEvent, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useRequirePlayer } from "../../hooks/usePlayerAuth";
import { apiFetch } from "../../lib/api";
import { ensureSocketConnected, socket } from "../../lib/socket";

type AnswerLetter = "A" | "B" | "C" | "D";

interface PlayerQuestionPayload {
  qid: string;
  prompt: string;
  options: Record<AnswerLetter, string>;
  points: number;
}

const PlayerQuestion = () => {
  const { qid } = useParams<{ qid: string }>();
  const navigate = useNavigate();
  const { loading, session } = useRequirePlayer();
  const [question, setQuestion] = useState<PlayerQuestionPayload | null>(null);
  const [choice, setChoice] = useState<AnswerLetter | "">("");
  const [status, setStatus] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    if (!qid) {
      navigate("/play/waiting", { replace: true });
      return;
    }
    ensureSocketConnected();
    apiFetch<PlayerQuestionPayload>(`/api/player/question/${qid}`)
      .then((data) => {
        setQuestion(data);
      })
      .catch(() => {
        setStatus("Question unavailable. Returning to lobby.");
        setTimeout(() => navigate("/play/waiting", { replace: true }), 1500);
      });
  }, [qid, navigate]);

  useEffect(() => {
    const handleResult = ({ qid: responseId, correct }: { qid: string; correct: boolean }) => {
      if (qid && responseId === qid) {
        setStatus(correct ? "Correct!" : "Not quite this time.");
        setLocked(true);
        setTimeout(() => navigate("/play/waiting", { replace: true }), 2000);
      }
    };
    socket.on("player:answerResult", handleResult);
    return () => {
      socket.off("player:answerResult", handleResult);
    };
  }, [qid, navigate]);

  if (loading) {
    return <div className="app-shell">Preparing question...</div>;
  }

  if (!question) {
    return <div className="app-shell">Loading question…</div>;
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!qid || !choice) {
      setStatus("Pick an answer before submitting.");
      return;
    }
    if (!session?.gameId) {
      setStatus("Lost game session. Return to the lobby.");
      setTimeout(() => navigate("/play/join"), 1500);
      return;
    }
    if (locked) {
      return;
    }
    setLocked(true);
    setStatus("Answer submitted. Waiting for result…");
    socket.emit(
      "player:answer",
      { gameId: session.gameId, qid, choice },
      (response: { ok: boolean; error?: string }) => {
        if (!response?.ok) {
          setStatus(response?.error || "Submission failed");
          setLocked(false);
        }
      }
    );
  };

  return (
    <div className="app-shell question-card">
      <header className="stack">
        <h1>{question.prompt}</h1>
        <p>{question.points} Punkte</p>
      </header>
      <form className="options-list" onSubmit={handleSubmit}>
        {(Object.keys(question.options) as AnswerLetter[]).map((option) => (
          <label key={option}>
            <input
              type="radio"
              name="player-answer"
              value={option}
              checked={choice === option}
              onChange={() => setChoice(option)}
              disabled={locked}
            />
            <strong>{option}.</strong> {question.options[option]}
          </label>
        ))}
        <button className="primary-button" type="submit" disabled={locked}>
          {locked ? "Submitted" : "Answer"}
        </button>
      </form>
      {status ? <div className="status-banner">{status}</div> : null}
    </div>
  );
};

export default PlayerQuestion;
