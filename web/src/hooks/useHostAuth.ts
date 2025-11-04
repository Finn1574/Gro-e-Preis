import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../lib/api";

export const useRequireHost = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    apiFetch<{ role: string }>("/api/host/session")
      .then(() => {
        if (active) {
          setLoading(false);
        }
      })
      .catch(() => {
        if (active) {
          setLoading(false);
          navigate("/host/login", { replace: true });
        }
      });

    return () => {
      active = false;
    };
  }, [navigate]);

  return loading;
};
