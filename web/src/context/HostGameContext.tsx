import { createContext, useContext, useMemo, useState } from "react";

interface HostGameState {
  gameId?: string;
  setGameId: (gameId?: string) => void;
}

const HostGameContext = createContext<HostGameState | undefined>(undefined);

interface HostGameProviderProps {
  children: React.ReactNode;
}

export const HostGameProvider: React.FC<HostGameProviderProps> = ({ children }) => {
  const [gameId, setGameIdState] = useState<string | undefined>(() => {
    return sessionStorage.getItem("hostGameId") || undefined;
  });

  const setGameId = (value?: string) => {
    setGameIdState(value);
    if (value) {
      sessionStorage.setItem("hostGameId", value);
    } else {
      sessionStorage.removeItem("hostGameId");
    }
  };

  const value = useMemo<HostGameState>(() => ({ gameId, setGameId }), [gameId]);

  return <HostGameContext.Provider value={value}>{children}</HostGameContext.Provider>;
};

export const useHostGame = (): HostGameState => {
  const ctx = useContext(HostGameContext);
  if (!ctx) {
    throw new Error("useHostGame must be used within HostGameProvider");
  }
  return ctx;
};
