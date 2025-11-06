package dhbw.dgp;

import com.sun.net.httpserver.Headers;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import com.sun.net.httpserver.HttpServer;

import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.StringJoiner;
import java.util.concurrent.Executors;
import java.util.function.Consumer;

/**
 * Simple HTTP server that exposes a player UI and APIs for remote answering.
 */
public class PlayerServer implements AutoCloseable {
    private final GameManager gameManager;
    private final Consumer<QuestionResult> resultConsumer;
    private final int port;
    private HttpServer httpServer;

    private final Object lock = new Object();
    private CurrentQuestion currentQuestion;
    private String lastMessage = "";

    public PlayerServer(GameManager gameManager, Consumer<QuestionResult> resultConsumer) {
        this(gameManager, resultConsumer, 8080);
    }

    public PlayerServer(GameManager gameManager, Consumer<QuestionResult> resultConsumer, int port) {
        this.gameManager = Objects.requireNonNull(gameManager, "gameManager");
        this.resultConsumer = Objects.requireNonNull(resultConsumer, "resultConsumer");
        this.port = port;
    }

    public void start() throws IOException {
        httpServer = HttpServer.create(new InetSocketAddress(port), 0);
        httpServer.createContext("/", new RootHandler());
        httpServer.createContext("/api/state", new StateHandler());
        httpServer.createContext("/api/answer", new AnswerHandler());
        httpServer.setExecutor(Executors.newCachedThreadPool());
        httpServer.start();
    }

    public void stop() {
        if (httpServer != null) {
            httpServer.stop(0);
        }
    }

    @Override
    public void close() {
        stop();
    }

    public boolean isQuestionActive() {
        synchronized (lock) {
            return currentQuestion != null && !currentQuestion.answered;
        }
    }

    public void presentQuestion(Category category, int points, Question question, Team activeTeam) {
        Objects.requireNonNull(category, "category");
        Objects.requireNonNull(question, "question");
        Objects.requireNonNull(activeTeam, "activeTeam");

        synchronized (lock) {
            if (currentQuestion != null && !currentQuestion.answered) {
                throw new IllegalStateException("Es ist bereits eine Frage aktiv.");
            }
            List<String> answers = new ArrayList<>(question.getAnswers());
            currentQuestion = new CurrentQuestion(
                    category.getName(),
                    points,
                    question.getQuestion() == null ? "" : question.getQuestion(),
                    answers,
                    activeTeam.getName(),
                    question.getCorrectAnswer()
            );
            lastMessage = "";
        }
    }

    private void clearCurrentQuestion() {
        synchronized (lock) {
            currentQuestion = null;
        }
    }

    public int getPort() {
        return port;
    }

    private final class RootHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            if (!"GET".equalsIgnoreCase(exchange.getRequestMethod())) {
                sendPlainText(exchange, 405, "Method Not Allowed");
                return;
            }
            byte[] content = buildIndexHtml().getBytes(StandardCharsets.UTF_8);
            Headers headers = exchange.getResponseHeaders();
            headers.add("Content-Type", "text/html; charset=utf-8");
            exchange.sendResponseHeaders(200, content.length);
            try (OutputStream os = exchange.getResponseBody()) {
                os.write(content);
            }
        }
    }

    private final class StateHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            if (!"GET".equalsIgnoreCase(exchange.getRequestMethod())) {
                sendPlainText(exchange, 405, "Method Not Allowed");
                return;
            }

            String json = buildStateJson();
            byte[] bytes = json.getBytes(StandardCharsets.UTF_8);

            Headers headers = exchange.getResponseHeaders();
            headers.add("Content-Type", "application/json; charset=utf-8");
            exchange.sendResponseHeaders(200, bytes.length);
            try (OutputStream os = exchange.getResponseBody()) {
                os.write(bytes);
            }
        }
    }

    private final class AnswerHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            if (!"POST".equalsIgnoreCase(exchange.getRequestMethod())) {
                sendPlainText(exchange, 405, "Method Not Allowed");
                return;
            }

            String body = new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8);
            Map<String, String> params = parseFormEncoded(body);

            String teamName = params.getOrDefault("team", "").trim();
            String playerName = params.getOrDefault("player", "").trim();
            String answerIndexStr = params.get("answer");

            ResponsePayload payload;
            CurrentQuestion snapshot;
            synchronized (lock) {
                if (currentQuestion == null || currentQuestion.answered) {
                    payload = ResponsePayload.error("Keine aktive Frage.");
                    sendJson(exchange, payload);
                    return;
                }
                snapshot = currentQuestion.copy();
                currentQuestion.answered = true;
            }

            if (teamName.isEmpty()) {
                payload = ResponsePayload.error("Bitte ein Team auswählen.");
                resetQuestionIfNotAnswered();
                sendJson(exchange, payload);
                return;
            }

            if (playerName.isEmpty()) {
                payload = ResponsePayload.error("Bitte zuerst einen Spielernamen festlegen.");
                resetQuestionIfNotAnswered();
                sendJson(exchange, payload);
                return;
            }

            Team team = gameManager.getTeamByName(teamName);
            if (team == null) {
                payload = ResponsePayload.error("Unbekanntes Team.");
                resetQuestionIfNotAnswered();
                sendJson(exchange, payload);
                return;
            }

            if (!snapshot.activeTeamName.equalsIgnoreCase(teamName)) {
                payload = ResponsePayload.error("Dieses Team ist gerade nicht an der Reihe.");
                resetQuestionIfNotAnswered();
                sendJson(exchange, payload);
                return;
            }

            int answerIndex;
            try {
                answerIndex = Integer.parseInt(answerIndexStr);
            } catch (NumberFormatException ex) {
                payload = ResponsePayload.error("Ungültige Antwortauswahl.");
                resetQuestionIfNotAnswered();
                sendJson(exchange, payload);
                return;
            }

            if (answerIndex < 0 || answerIndex >= snapshot.answers.size()) {
                payload = ResponsePayload.error("Antwort existiert nicht.");
                resetQuestionIfNotAnswered();
                sendJson(exchange, payload);
                return;
            }

            String givenAnswer = snapshot.answers.get(answerIndex);

            boolean correct = gameManager.answerQuestion(
                    gameManager.getCategoryByName(snapshot.categoryName),
                    snapshot.points,
                    team,
                    givenAnswer
            );

            QuestionResult result = new QuestionResult(
                    snapshot.categoryName,
                    snapshot.points,
                    team.getName(),
                    playerName,
                    correct,
                    snapshot.correctAnswer
            );

            if (correct) {
                payload = ResponsePayload.success("Richtig! Spieler " + playerName + " (Team " + team.getName() + ") erhält " + snapshot.points + " Punkte.");
            } else {
                payload = ResponsePayload.success("Leider falsch. Die richtige Antwort lautet: " + snapshot.correctAnswer + ".");
            }

            lastMessage = payload.message();
            clearCurrentQuestion();
            resultConsumer.accept(result);
            sendJson(exchange, payload);
        }

        private void resetQuestionIfNotAnswered() {
            synchronized (lock) {
                if (currentQuestion != null && !currentQuestion.answered) {
                    // leave question active
                } else if (currentQuestion != null && currentQuestion.answered) {
                    clearCurrentQuestion();
                }
            }
        }
    }

    private void sendPlainText(HttpExchange exchange, int status, String message) throws IOException {
        byte[] bytes = message.getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().add("Content-Type", "text/plain; charset=utf-8");
        exchange.sendResponseHeaders(status, bytes.length);
        try (OutputStream os = exchange.getResponseBody()) {
            os.write(bytes);
        }
    }

    private void sendJson(HttpExchange exchange, ResponsePayload payload) throws IOException {
        String json = payload.toJson();
        byte[] bytes = json.getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().add("Content-Type", "application/json; charset=utf-8");
        exchange.sendResponseHeaders(payload.statusCode(), bytes.length);
        try (OutputStream os = exchange.getResponseBody()) {
            os.write(bytes);
        }
    }

    private Map<String, String> parseFormEncoded(String body) {
        Map<String, String> params = new LinkedHashMap<>();
        if (body == null || body.isBlank()) {
            return params;
        }
        String[] pairs = body.split("&");
        for (String pair : pairs) {
            int idx = pair.indexOf('=');
            if (idx >= 0) {
                String key = decode(pair.substring(0, idx));
                String value = decode(pair.substring(idx + 1));
                params.put(key, value);
            } else {
                params.put(decode(pair), "");
            }
        }
        return params;
    }

    private String decode(String value) {
        return URLDecoder.decode(value, StandardCharsets.UTF_8);
    }

    private String buildStateJson() {
        StringBuilder sb = new StringBuilder();
        sb.append("{");
        Team currentTeam = gameManager.getCurrentTeam();

        sb.append("\"activeTeam\":");
        if (currentTeam == null) {
            sb.append("null");
        } else {
            sb.append("\"").append(escapeJson(currentTeam.getName())).append("\"");
        }
        sb.append(",");

        CurrentQuestion snapshot;
        synchronized (lock) {
            snapshot = currentQuestion != null && !currentQuestion.answered ? currentQuestion.copy() : null;
        }

        sb.append("\"questionActive\":").append(snapshot != null);
        sb.append(",");

        if (snapshot == null) {
            sb.append("\"question\":null,");
        } else {
            sb.append("\"question\":{");
            sb.append("\"category\":\"").append(escapeJson(snapshot.categoryName)).append("\",");
            sb.append("\"points\":").append(snapshot.points).append(",");
            sb.append("\"prompt\":\"").append(escapeJson(snapshot.prompt)).append("\",");
            sb.append("\"answers\":[");
            for (int i = 0; i < snapshot.answers.size(); i++) {
                if (i > 0) {
                    sb.append(",");
                }
                sb.append("\"").append(escapeJson(snapshot.answers.get(i))).append("\"");
            }
            sb.append("],");
            sb.append("\"team\":\"").append(escapeJson(snapshot.activeTeamName)).append("\"");
            sb.append("},");
        }

        sb.append("\"teams\":[");
        List<Team> teams = gameManager.getTeams();
        for (int i = 0; i < teams.size(); i++) {
            if (i > 0) {
                sb.append(",");
            }
            sb.append("\"").append(escapeJson(teams.get(i).getName())).append("\"");
        }
        sb.append("],");

        sb.append("\"scoreboard\":[");
        List<Map.Entry<Team, Integer>> leaderboard = gameManager.getPointsManager().getLeaderboard();
        for (int i = 0; i < leaderboard.size(); i++) {
            Map.Entry<Team, Integer> entry = leaderboard.get(i);
            if (i > 0) {
                sb.append(",");
            }
            sb.append("{\"team\":\"").append(escapeJson(entry.getKey().getName()))
                    .append("\",\"points\":").append(entry.getValue()).append("}");
        }
        sb.append("],");

        sb.append("\"message\":");
        if (lastMessage == null || lastMessage.isBlank()) {
            sb.append("null");
        } else {
            sb.append("\"").append(escapeJson(lastMessage)).append("\"");
        }

        sb.append("}");
        return sb.toString();
    }

    private String buildIndexHtml() {
        return """
                <!DOCTYPE html>
                <html lang="de">
                <head>
                    <meta charset="UTF-8">
                    <title>Der Große Preis – Spielerkonsole</title>
                    <style>
                        body { font-family: Arial, sans-serif; background: #0d47a1; color: #fff; margin: 0; padding: 0; }
                        .container { max-width: 800px; margin: 0 auto; padding: 24px; }
                        h1 { text-align: center; margin-bottom: 16px; }
                        .card { background: rgba(255,255,255,0.1); padding: 16px; border-radius: 12px; margin-bottom: 16px; }
                        label { display: block; margin-bottom: 6px; font-weight: bold; }
                        input[type="text"], select { width: 100%; padding: 10px; border-radius: 8px; border: none; font-size: 16px; }
                        input[disabled], select[disabled] { opacity: 0.6; cursor: not-allowed; }
                        .input-row { display: flex; gap: 8px; }
                        .input-row button { padding: 10px 16px; font-size: 16px; border: none; border-radius: 8px; background: #1976d2; color: #fff; cursor: pointer; }
                        .identity-card button:disabled { opacity: 0.6; cursor: not-allowed; }
                        .identity-banner { display: none; background: rgba(255,255,255,0.18); padding: 10px 16px; border-radius: 10px; font-weight: 600; margin-bottom: 12px; }
                        .hidden { display: none !important; }
                        .question-prompt { font-size: 20px; margin-bottom: 16px; }
                        .active-team { margin-bottom: 12px; font-weight: bold; }
                        .answers { display: grid; gap: 12px; }
                        .answer-btn { padding: 14px; font-size: 16px; border: none; border-radius: 10px; background: #1976d2; color: #fff; cursor: pointer; }
                        .answer-btn:disabled { background: rgba(25,118,210,0.4); cursor: not-allowed; }
                        .info-text { background: rgba(255,255,255,0.12); padding: 12px; border-radius: 8px; text-align: center; }
                        .scoreboard { display: grid; gap: 8px; }
                        .scoreboard-item { background: rgba(255,255,255,0.08); padding: 10px; border-radius: 8px; }
                        .message { margin-top: 12px; font-weight: bold; min-height: 24px; }
                    </style>
                </head>
                <body>
                <div class="container">
                    <h1>Der Große Preis</h1>
                    <div id="identityBanner" class="identity-banner hidden"></div>
                    <div class="card identity-card" id="identityCard">
                        <h2>Spieler anmelden</h2>
                        <div id="identitySetup">
                            <label for="playerNameInput">Name</label>
                            <div class="input-row">
                                <input type="text" id="playerNameInput" placeholder="Dein Name"/>
                                <button id="confirmNameBtn">Speichern</button>
                            </div>
                            <div id="teamSelection" class="hidden">
                                <label for="teamSelect">Team auswählen</label>
                                <select id="teamSelect"></select>
                                <button id="confirmTeamBtn">Team bestätigen</button>
                            </div>
                        </div>
                        <div id="identitySummary" class="hidden"></div>
                    </div>
                    <div class="card">
                        <div id="questionPrompt" class="question-prompt">Warte auf die nächste Frage…</div>
                        <div id="activeTeam" class="active-team"></div>
                        <div id="answers" class="answers"></div>
                    </div>
                    <div class="card">
                        <h2>Punktestand</h2>
                        <div id="scoreboard" class="scoreboard"></div>
                        <div id="message" class="message"></div>
                    </div>
                </div>
                <script>
                    const identity = {
                        name: localStorage.getItem('dgpPlayerName') || '',
                        team: localStorage.getItem('dgpPlayerTeam') || ''
                    };

                    const elements = {
                        identityBanner: document.getElementById('identityBanner'),
                        playerNameInput: document.getElementById('playerNameInput'),
                        confirmNameBtn: document.getElementById('confirmNameBtn'),
                        teamSelection: document.getElementById('teamSelection'),
                        teamSelect: document.getElementById('teamSelect'),
                        confirmTeamBtn: document.getElementById('confirmTeamBtn'),
                        identitySetup: document.getElementById('identitySetup'),
                        identitySummary: document.getElementById('identitySummary'),
                        questionPrompt: document.getElementById('questionPrompt'),
                        activeTeam: document.getElementById('activeTeam'),
                        answers: document.getElementById('answers'),
                        scoreboard: document.getElementById('scoreboard'),
                        message: document.getElementById('message')
                    };

                    elements.confirmNameBtn.addEventListener('click', () => {
                        const value = elements.playerNameInput.value.trim();
                        if (!value) {
                            alert('Bitte einen Namen eingeben.');
                            return;
                        }
                        if (identity.name && identity.name !== value) {
                            alert('Der Name kann nach dem Speichern nicht mehr geändert werden.');
                            elements.playerNameInput.value = identity.name;
                            return;
                        }
                        identity.name = value;
                        localStorage.setItem('dgpPlayerName', identity.name);
                        applyIdentityUI();
                    });

                    elements.confirmTeamBtn.addEventListener('click', () => {
                        if (!identity.name) {
                            alert('Bitte zuerst einen Namen festlegen.');
                            return;
                        }
                        const team = elements.teamSelect.value.trim();
                        if (!team) {
                            alert('Bitte ein Team auswählen.');
                            return;
                        }
                        identity.team = team;
                        localStorage.setItem('dgpPlayerTeam', identity.team);
                        applyIdentityUI();
                    });

                    function applyIdentityUI() {
                        const hasName = !!identity.name;
                        const hasTeam = !!identity.team;

                        elements.identityBanner.classList.toggle('hidden', !hasName);
                        elements.identityBanner.textContent = hasName
                                ? (hasTeam ? identity.name + ' – ' + identity.team : identity.name)
                                : '';

                        elements.identitySetup.classList.toggle('hidden', hasName && hasTeam);

                        elements.playerNameInput.value = identity.name;
                        elements.playerNameInput.disabled = hasName;
                        elements.confirmNameBtn.disabled = hasName;
                        elements.confirmNameBtn.classList.toggle('hidden', hasName);

                        elements.teamSelection.classList.toggle('hidden', !hasName || hasTeam);
                        elements.teamSelect.disabled = hasTeam;
                        elements.confirmTeamBtn.disabled = hasTeam;
                        elements.confirmTeamBtn.classList.toggle('hidden', hasTeam);

                        if (hasTeam) {
                            ensureTeamOption(identity.team);
                            elements.teamSelect.value = identity.team;
                        } else if (hasName) {
                            elements.teamSelect.value = '';
                        }

                        elements.identitySummary.classList.toggle('hidden', !(hasName && hasTeam));
                        if (hasName && hasTeam) {
                            elements.identitySummary.innerHTML = '<strong>' + escapeHtml(identity.name) + '</strong><br/>Team: ' + escapeHtml(identity.team);
                        } else if (hasName) {
                            elements.identitySummary.innerHTML = '<strong>' + escapeHtml(identity.name) + '</strong><br/>Bitte Team wählen.';
                        } else {
                            elements.identitySummary.innerHTML = '';
                        }
                    }

                    function ensureTeamOption(team) {
                        if (!team) return;
                        const options = Array.from(elements.teamSelect.options).map(o => o.value);
                        if (!options.includes(team)) {
                            const option = document.createElement('option');
                            option.value = team;
                            option.textContent = team;
                            elements.teamSelect.appendChild(option);
                        }
                    }

                    async function fetchState() {
                        try {
                            const response = await fetch('/api/state');
                            if (!response.ok) return;
                            const data = await response.json();
                            renderState(data);
                        } catch (e) {
                            console.error('Fehler beim Laden des Spielstands', e);
                        }
                    }

                    function renderState(state) {
                        if (state.teams) {
                            elements.teamSelect.innerHTML = '';
                            state.teams.forEach(team => {
                                const option = document.createElement('option');
                                option.value = team;
                                option.textContent = team;
                                elements.teamSelect.appendChild(option);
                            });
                        }

                        ensureTeamOption(identity.team);

                        if (identity.team) {
                            elements.teamSelect.value = identity.team;
                        }

                        const promptText = state.question && state.questionActive
                                ? (state.question.prompt || 'Keine Frage vorhanden.')
                                : 'Warte auf die nächste Frage…';
                        elements.questionPrompt.textContent = promptText;
                        elements.activeTeam.textContent = state.question && state.questionActive
                                ? 'Aktives Team: ' + (state.question.team || '-')
                                : '';

                        elements.answers.innerHTML = '';
                        if (state.question && state.questionActive && Array.isArray(state.question.answers)) {
                            state.question.answers.forEach((answer, index) => {
                                const button = document.createElement('button');
                                button.className = 'answer-btn';
                                button.textContent = answer;
                                const canAnswer = identity.name && identity.team && state.question.team && identity.team === state.question.team;
                                button.disabled = !canAnswer;
                                button.addEventListener('click', () => submitAnswer(index));
                                elements.answers.appendChild(button);
                            });

                            if (!identity.name || !identity.team) {
                                const info = document.createElement('div');
                                info.className = 'info-text';
                                info.textContent = 'Bitte zuerst Name und Team festlegen.';
                                elements.answers.appendChild(info);
                            } else if (state.question.team && identity.team !== state.question.team) {
                                const info = document.createElement('div');
                                info.className = 'info-text';
                                info.textContent = 'Dieses Team ist aktuell nicht an der Reihe.';
                                elements.answers.appendChild(info);
                            }
                        }

                        elements.scoreboard.innerHTML = '';
                        if (state.scoreboard) {
                            state.scoreboard.forEach(entry => {
                                const div = document.createElement('div');
                                div.className = 'scoreboard-item';
                                div.textContent = entry.team + ': ' + entry.points;
                                elements.scoreboard.appendChild(div);
                            });
                        }

                        elements.message.textContent = state.message || '';

                        applyIdentityUI();
                    }

                    async function submitAnswer(answerIndex) {
                        if (!identity.name) {
                            alert('Bitte zuerst einen Namen festlegen.');
                            return;
                        }
                        if (!identity.team) {
                            alert('Bitte zuerst ein Team festlegen.');
                            return;
                        }
                        const formData = new URLSearchParams();
                        formData.append('team', identity.team);
                        formData.append('player', identity.name);
                        formData.append('answer', String(answerIndex));
                        try {
                            const response = await fetch('/api/answer', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                                body: formData.toString()
                            });
                            const data = await response.json();
                            alert(data.message);
                        } catch (e) {
                            alert('Fehler beim Senden der Antwort.');
                        } finally {
                            setTimeout(fetchState, 200);
                        }
                    }

                    function escapeHtml(value) {
                        if (!value) {
                            return '';
                        }
                        return value.replace(/[&<>"']/g, function(match) {
                            switch (match) {
                                case '&': return '&amp;';
                                case '<': return '&lt;';
                                case '>': return '&gt;';
                                case '"': return '&quot;';
                                case "'": return '&#39;';
                                default: return match;
                            }
                        });
                    }

                    applyIdentityUI();
                    fetchState();
                    setInterval(fetchState, 1500);
                </script>
                </body>
                </html>
                """;
    }

    private String escapeJson(String value) {
        if (value == null) {
            return "";
        }
        StringBuilder sb = new StringBuilder();
        for (char c : value.toCharArray()) {
            switch (c) {
                case '"':
                    sb.append("\\\"");
                    break;
                case '\\':
                    sb.append("\\\\");
                    break;
                case '\n':
                    sb.append("\\n");
                    break;
                case '\r':
                    sb.append("\\r");
                    break;
                case '\t':
                    sb.append("\\t");
                    break;
                default:
                    if (c < 32) {
                        sb.append(String.format("\\u%04x", (int) c));
                    } else {
                        sb.append(c);
                    }
            }
        }
        return sb.toString();
    }

    private static class CurrentQuestion {
        final String categoryName;
        final int points;
        final String prompt;
        final List<String> answers;
        final String activeTeamName;
        final String correctAnswer;
        boolean answered;

        CurrentQuestion(String categoryName, int points, String prompt, List<String> answers, String activeTeamName, String correctAnswer) {
            this.categoryName = categoryName;
            this.points = points;
            this.prompt = prompt;
            this.answers = answers;
            this.activeTeamName = activeTeamName;
            this.correctAnswer = correctAnswer;
            this.answered = false;
        }

        CurrentQuestion copy() {
            return new CurrentQuestion(categoryName, points, prompt, new ArrayList<>(answers), activeTeamName, correctAnswer);
        }
    }

    public static class QuestionResult {
        private final String categoryName;
        private final int points;
        private final String teamName;
        private final String playerName;
        private final boolean correct;
        private final String correctAnswer;

        public QuestionResult(String categoryName, int points, String teamName, String playerName, boolean correct, String correctAnswer) {
            this.categoryName = categoryName;
            this.points = points;
            this.teamName = teamName;
            this.playerName = playerName;
            this.correct = correct;
            this.correctAnswer = correctAnswer;
        }

        public String getCategoryName() {
            return categoryName;
        }

        public int getPoints() {
            return points;
        }

        public String getTeamName() {
            return teamName;
        }

        public String getPlayerName() {
            return playerName;
        }

        public boolean isCorrect() {
            return correct;
        }

        public String getCorrectAnswer() {
            return correctAnswer;
        }
    }

    private record ResponsePayload(boolean success, String message, int statusCode) {
        static ResponsePayload success(String message) {
            return new ResponsePayload(true, message, 200);
        }

        static ResponsePayload error(String message) {
            return new ResponsePayload(false, message, 400);
        }

        String toJson() {
            StringJoiner joiner = new StringJoiner(",", "{", "}");
            joiner.add("\"success\":" + success);
            joiner.add("\"message\":\"" + escape(message) + "\"");
            return joiner.toString();
        }

        private String escape(String value) {
            if (value == null) {
                return "";
            }
            StringBuilder sb = new StringBuilder();
            for (char c : value.toCharArray()) {
                switch (c) {
                    case '"':
                        sb.append("\\\"");
                        break;
                    case '\\':
                        sb.append("\\\\");
                        break;
                    case '\n':
                        sb.append("\\n");
                        break;
                    case '\r':
                        sb.append("\\r");
                        break;
                    case '\t':
                        sb.append("\\t");
                        break;
                    default:
                        if (c < 32) {
                            sb.append(String.format("\\u%04x", (int) c));
                        } else {
                            sb.append(c);
                        }
                }
            }
            return sb.toString();
        }
    }
}
