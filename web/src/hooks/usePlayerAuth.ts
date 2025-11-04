import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../lib/api";

export interface PlayerSession {
  role: "player";
  name?: string;
  gameId: string;
}

interface PlayerAuthState {
  loading: boolean;
  session?: PlayerSession;
}

export const useRequirePlayer = (): PlayerAuthState => {
  const navigate = useNavigate();
  const [state, setState] = useState<PlayerAuthState>({ loading: true });

  useEffect(() => {
    let active = true;
    apiFetch<PlayerSession>("/api/player/session")
      .then((session) => {
        if (active) {
          setState({ loading: false, session });
        }
      })
      .catch(() => {
        if (active) {
          setState({ loading: false });
          navigate("/play/join", { replace: true });
        }
      });

    return () => {
      active = false;
    };
  }, [navigate]);

  return state;
};
