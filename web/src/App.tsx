import { BrowserRouter, Link, Navigate, Route, Routes } from "react-router-dom";
import { HostGameProvider } from "./context/HostGameContext";
import HostDashboard from "./routes/host/Dashboard";
import HostLogin from "./routes/host/Login";
import HostStart from "./routes/host/Start";
import HostBoard from "./routes/host/Board";
import HostQuestion from "./routes/host/HostQuestion";
import AISettings from "./routes/host/AISettings";
import GameSettings from "./routes/host/GameSettings";
import PlayerJoin from "./routes/play/Join";
import PlayerWaiting from "./routes/play/Waiting";
import PlayerQuestion from "./routes/play/PlayerQuestion";

const Landing = () => (
  <div className="app-shell stack">
    <h1>Der Große Preis</h1>
    <p>Welcome to the modern quiz experience. Choose your role to continue.</p>
    <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
      <Link className="primary-button" to="/host/login">
        Host Login
      </Link>
      <Link className="secondary-button" to="/play/join">
        Player Join
      </Link>
    </div>
  </div>
);

const NotFound = () => (
  <div className="app-shell stack">
    <h1>Page not found</h1>
    <Link className="link-button" to="/">
      Go back home
    </Link>
  </div>
);

const App = () => (
  <BrowserRouter>
    <HostGameProvider>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/host/login" element={<HostLogin />} />
        <Route path="/host/dashboard" element={<HostDashboard />} />
        <Route path="/host/start" element={<HostStart />} />
        <Route path="/host/board" element={<HostBoard />} />
        <Route path="/host/question/:qid" element={<HostQuestion />} />
        <Route path="/host/ai" element={<AISettings />} />
        <Route path="/host/settings" element={<GameSettings />} />

        <Route path="/play/join" element={<PlayerJoin />} />
        <Route path="/play/waiting" element={<PlayerWaiting />} />
        <Route path="/play/question/:qid" element={<PlayerQuestion />} />

        <Route path="*" element={<NotFound />} />
      </Routes>
    </HostGameProvider>
  </BrowserRouter>
);

export default App;
