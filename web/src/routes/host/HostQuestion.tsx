import { FormEvent, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useRequireHost } from "../../hooks/useHostAuth";
import { apiFetch } from "../../lib/api";

type AnswerLetter = "A" | "B" | "C" | "D";

interface HostQuestionPayload {
  qid: string;
  prompt: string;
  options: Record<AnswerLetter, string>;
  answer: AnswerLetter;
  points: number;
}

const HostQuestion = () => {
  const { qid } = useParams<{ qid: string }>();
  const [question, setQuestion] = useState<HostQuestionPayload | null>(null);
  const [selection, setSelection] = useState<AnswerLetter | "">("");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const checking = useRequireHost();

  useEffect(() => {
    if (!qid) {
      navigate("/host/board", { replace: true });
      return;
    }
    apiFetch<HostQuestionPayload>(`/api/host/question/${qid}`)
      .then((data) => {
        setQuestion(data);
        setSelection(data.answer);
      })
      .catch((err) => {
        setMessage(err instanceof Error ? err.message : "Could not load question");
      });
  }, [qid, navigate]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!qid || !selection) {
      setMessage("Please select an answer before submitting.");
      return;
    }
    setLoading(true);
    try {
      await apiFetch(`/api/host/question/${qid}/submit`, {
        method: "POST",
        body: JSON.stringify({ choice: selection })
      });
      navigate("/host/board", { replace: true });
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return <div className="app-shell">Loading question...</div>;
  }

  if (!question) {
    return <div className="app-shell">Fetching question...</div>;
  }

  return (
    <div className="app-shell question-card">
      <header className="stack">
        <h1>{question.prompt}</h1>
        <p>{question.points} Punkte</p>
      </header>
      <form className="options-list" onSubmit={handleSubmit}>
        {(Object.keys(question.options) as AnswerLetter[]).map((key) => (
          <label key={key}>
            <input
              type="radio"
              name="host-answer"
              value={key}
              checked={selection === key}
              onChange={() => setSelection(key)}
            />
            <strong>{key}.</strong> {question.options[key]}
          </label>
        ))}
        <button className="primary-button" type="submit" disabled={loading}>
          {loading ? "Submitting..." : "Submit and return"}
        </button>
      </form>
      {message ? <div className="status-banner">{message}</div> : null}
    </div>
  );
};

export default HostQuestion;
