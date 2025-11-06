package dhbw.dgp;

import javax.swing.*;
import javax.swing.border.EmptyBorder;
import javax.swing.border.TitledBorder;
import java.awt.BorderLayout;
import java.awt.Color;
import java.awt.Dimension;
import java.awt.Font;
import java.awt.GridLayout;
import java.awt.event.WindowAdapter;
import java.awt.event.WindowEvent;
import java.io.IOException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Swing-based host UI that cooperates with the PlayerServer for remote answers.
 */
public class GameFrame extends JFrame {
    private static final Color COLOR_PRIMARY = new Color(0x1976D2);
    private static final Color COLOR_PENDING = new Color(0x455A64);
    private static final Color COLOR_CORRECT = new Color(0x388E3C);
    private static final Color COLOR_INCORRECT = new Color(0xD32F2F);

    private final GameManager gameManager;
    private final ConfiguratorOverview configuratorOverview;
    private final PlayerServer playerServer;

    private JPanel scoreboardPanel;
    private JLabel currentTeamLabel;
    private JLabel questionLabel;
    private final Map<String, JButton> questionButtons = new HashMap<>();

    public GameFrame() {
        super("Der Große Preis");
        this.gameManager = new GameManager();
        this.configuratorOverview = new ConfiguratorOverview();
        this.playerServer = startPlayerServer();

        setDefaultCloseOperation(WindowConstants.EXIT_ON_CLOSE);
        setLayout(new BorderLayout(12, 12));
        setMinimumSize(new Dimension(940, 620));

        addWindowListener(new WindowAdapter() {
            @Override
            public void windowClosing(WindowEvent e) {
                playerServer.stop();
            }
        });

        initialiseGame();
    }

    private PlayerServer startPlayerServer() {
        try {
            PlayerServer server = new PlayerServer(gameManager, this::onQuestionAnswered);
            server.start();
            return server;
        } catch (IOException ex) {
            JOptionPane.showMessageDialog(
                    this,
                    "Der Spielerserver konnte nicht gestartet werden: " + ex.getMessage(),
                    "Serverfehler",
                    JOptionPane.ERROR_MESSAGE
            );
            throw new IllegalStateException("Player server start failed", ex);
        }
    }

    private void initialiseGame() {
        Configuration configuration = chooseConfiguration();
        if (configuration == null) {
            playerServer.stop();
            dispose();
            return;
        }

        gameManager.loadGame(configuration);
        collectTeams();
        if (gameManager.getTeams().isEmpty()) {
            JOptionPane.showMessageDialog(this, "Es wurden keine Teams angelegt.", "Spiel beendet", JOptionPane.INFORMATION_MESSAGE);
            playerServer.stop();
            dispose();
            return;
        }

        buildUi(configuration);
        updateCurrentTeamLabel();
        updateScoreboard();
        showPlayerInfo();
    }

    private Configuration chooseConfiguration() {
        List<Configuration> configurations = configuratorOverview.getConfigurations();
        if (configurations.isEmpty()) {
            ConfigurationBuilder builder = configuratorOverview.createNewConfiguration();
            builder.setTitle("Ad-hoc Spiel");
            return builder.getConfiguration();
        }

        String[] titles = configurations.stream()
                .map(Configuration::getTitle)
                .toArray(String[]::new);

        String selectedTitle = (String) JOptionPane.showInputDialog(
                this,
                "Konfiguration auswählen:",
                "Konfiguration",
                JOptionPane.PLAIN_MESSAGE,
                null,
                titles,
                titles[0]);

        if (selectedTitle == null) {
            return null;
        }

        for (Configuration configuration : configurations) {
            if (configuration.getTitle().equals(selectedTitle)) {
                configuratorOverview.setCurrentConfiguration(configuration);
                return configuration;
            }
        }

        return configurations.get(0);
    }

    private void collectTeams() {
        int teamCount = askForInteger("Wie viele Teams spielen mit? (1-6)", 1, 6, 3);
        if (teamCount <= 0) {
            return;
        }

        for (int i = 1; i <= teamCount; i++) {
            String name = askForText("Name für Team " + i + ":");
            if (name == null || name.isBlank()) {
                name = "Team " + i;
            }
            gameManager.createTeam(name.trim());
        }
    }

    private void buildUi(Configuration configuration) {
        add(buildHeaderPanel(), BorderLayout.NORTH);
        add(buildBoardPanel(configuration), BorderLayout.CENTER);
        add(buildSidebar(), BorderLayout.EAST);
    }

    private JPanel buildHeaderPanel() {
        JPanel header = new JPanel(new BorderLayout());
        header.setBorder(new EmptyBorder(10, 10, 0, 10));

        JLabel title = new JLabel("Der Große Preis", SwingConstants.LEFT);
        title.setFont(title.getFont().deriveFont(Font.BOLD, 24f));
        header.add(title, BorderLayout.WEST);

        currentTeamLabel = new JLabel("", SwingConstants.RIGHT);
        currentTeamLabel.setFont(currentTeamLabel.getFont().deriveFont(Font.BOLD, 18f));
        header.add(currentTeamLabel, BorderLayout.EAST);

        questionLabel = new JLabel("Wähle eine Frage, um zu starten.", SwingConstants.CENTER);
        questionLabel.setBorder(new EmptyBorder(12, 10, 12, 10));
        questionLabel.setFont(questionLabel.getFont().deriveFont(Font.PLAIN, 18f));

        JPanel container = new JPanel(new BorderLayout());
        container.add(header, BorderLayout.NORTH);
        container.add(questionLabel, BorderLayout.SOUTH);
        return container;
    }

    private JScrollPane buildBoardPanel(Configuration configuration) {
        List<Category> categories = configuration.getCategories();

        JPanel boardPanel = new JPanel();
        boardPanel.setBorder(new EmptyBorder(10, 10, 10, 10));
        boardPanel.setLayout(new GridLayout(1, Math.max(categories.size(), 1), 12, 12));

        questionButtons.clear();

        for (Category category : categories) {
            JPanel column = new JPanel(new BorderLayout(0, 8));
            JLabel categoryLabel = new JLabel(category.getName(), SwingConstants.CENTER);
            categoryLabel.setFont(categoryLabel.getFont().deriveFont(Font.BOLD, 16f));
            column.add(categoryLabel, BorderLayout.NORTH);

            JPanel buttonsPanel = new JPanel(new GridLayout(category.getPointValues().size(), 1, 8, 8));
            buttonsPanel.setBorder(new EmptyBorder(4, 4, 4, 4));

            for (Integer points : category.getPointValues()) {
                JButton button = new JButton(points + " Punkte");
                button.setFont(button.getFont().deriveFont(Font.BOLD, 14f));
                button.setBackground(COLOR_PRIMARY);
                button.setForeground(Color.WHITE);
                button.addActionListener(e -> handleQuestionSelection(category, points, button));

                buttonsPanel.add(button);
                questionButtons.put(buttonKey(category.getName(), points), button);
            }

            column.add(buttonsPanel, BorderLayout.CENTER);
            boardPanel.add(column);
        }

        JScrollPane scrollPane = new JScrollPane(boardPanel);
        scrollPane.setBorder(null);
        return scrollPane;
    }

    private JPanel buildSidebar() {
        JPanel sidebar = new JPanel(new BorderLayout());
        sidebar.setPreferredSize(new Dimension(260, 0));
        sidebar.setBorder(new EmptyBorder(10, 10, 10, 10));

        scoreboardPanel = new JPanel();
        scoreboardPanel.setLayout(new BoxLayout(scoreboardPanel, BoxLayout.Y_AXIS));
        scoreboardPanel.setBorder(new TitledBorder("Punktestand"));

        sidebar.add(scoreboardPanel, BorderLayout.NORTH);
        return sidebar;
    }

    private void handleQuestionSelection(Category category, int points, JButton button) {
        if (playerServer.isQuestionActive()) {
            JOptionPane.showMessageDialog(this, "Bitte warte, bis die aktuelle Frage beantwortet ist.", "Frage aktiv", JOptionPane.INFORMATION_MESSAGE);
            return;
        }

        Team currentTeam = gameManager.getCurrentTeam();
        if (currentTeam == null) {
            JOptionPane.showMessageDialog(this, "Es ist kein Team aktiv.", "Hinweis", JOptionPane.WARNING_MESSAGE);
            return;
        }

        Question question = gameManager.getGameOverview().getQuestion(category, points);
        if (question == null) {
            button.setEnabled(false);
            JOptionPane.showMessageDialog(this, "Für diese Auswahl existiert keine Frage.", "Fehler", JOptionPane.ERROR_MESSAGE);
            return;
        }

        try {
            playerServer.presentQuestion(category, points, question, currentTeam);
        } catch (IllegalStateException ex) {
            JOptionPane.showMessageDialog(this, ex.getMessage(), "Frage aktiv", JOptionPane.WARNING_MESSAGE);
            return;
        }

        button.setEnabled(false);
        button.setBackground(COLOR_PENDING);
        questionLabel.setText(formatQuestionText(category.getName(), points, question.getQuestion()));
    }

    private void onQuestionAnswered(PlayerServer.QuestionResult result) {
        SwingUtilities.invokeLater(() -> handleQuestionAnsweredOnEdt(result));
    }

    private void handleQuestionAnsweredOnEdt(PlayerServer.QuestionResult result) {
        updateScoreboard();

        JButton button = questionButtons.get(buttonKey(result.getCategoryName(), result.getPoints()));
        if (button != null) {
            button.setEnabled(false);
            button.setBackground(result.isCorrect() ? COLOR_CORRECT : COLOR_INCORRECT);
        }

        String participant = result.getPlayerName() == null || result.getPlayerName().isBlank()
                ? "Team \"" + result.getTeamName() + "\""
                : "Spieler \"" + result.getPlayerName() + "\" (Team \"" + result.getTeamName() + "\")";

        String message = result.isCorrect()
                ? participant + " hat die Frage richtig beantwortet und erhält " + result.getPoints() + " Punkte."
                : participant + " hat leider falsch geantwortet. Richtige Antwort: " + result.getCorrectAnswer();

        questionLabel.setText("<html><div style='text-align:center; font-size:16px;'>" + escapeHtml(message) + "</div></html>");
        JOptionPane.showMessageDialog(
                this,
                message,
                result.isCorrect() ? "Richtige Antwort" : "Falsche Antwort",
                result.isCorrect() ? JOptionPane.INFORMATION_MESSAGE : JOptionPane.WARNING_MESSAGE
        );

        gameManager.nextTeam();
        updateCurrentTeamLabel();
    }

    private void updateScoreboard() {
        scoreboardPanel.removeAll();

        List<Map.Entry<Team, Integer>> leaderboard = gameManager.getPointsManager().getLeaderboard();
        if (leaderboard.isEmpty()) {
            for (Team team : gameManager.getTeams()) {
                JLabel label = new JLabel(team.getName() + ": 0");
                label.setBorder(new EmptyBorder(2, 0, 2, 0));
                scoreboardPanel.add(label);
            }
        } else {
            for (Map.Entry<Team, Integer> entry : leaderboard) {
                JLabel label = new JLabel(entry.getKey().getName() + ": " + entry.getValue());
                label.setBorder(new EmptyBorder(2, 0, 2, 0));
                scoreboardPanel.add(label);
            }
        }

        scoreboardPanel.revalidate();
        scoreboardPanel.repaint();
    }

    private void updateCurrentTeamLabel() {
        Team currentTeam = gameManager.getCurrentTeam();
        if (currentTeam == null) {
            currentTeamLabel.setText("Kein aktives Team");
        } else {
            currentTeamLabel.setText("Aktives Team: " + currentTeam.getName());
        }
    }

    private int askForInteger(String message, int min, int max, int defaultValue) {
        while (true) {
            String input = JOptionPane.showInputDialog(this, message, defaultValue);
            if (input == null) {
                return -1;
            }

            try {
                int value = Integer.parseInt(input.trim());
                if (value < min || value > max) {
                    JOptionPane.showMessageDialog(this, "Bitte eine Zahl zwischen " + min + " und " + max + " eingeben.");
                    continue;
                }
                return value;
            } catch (NumberFormatException ex) {
                JOptionPane.showMessageDialog(this, "Ungültige Zahl, bitte erneut versuchen.");
            }
        }
    }

    private String askForText(String message) {
        return JOptionPane.showInputDialog(this, message);
    }

    private String buttonKey(String categoryName, int points) {
        return categoryName + ":" + points;
    }

    private String formatQuestionText(String categoryName, int points, String prompt) {
        String text = (prompt == null || prompt.isBlank()) ? "Keine Frage hinterlegt." : prompt;
        return "<html><div style='text-align:center; font-size:16px;'>"
                + escapeHtml(categoryName + " – " + points + " Punkte")
                + "<br/><br/>"
                + escapeHtml(text)
                + "</div></html>";
    }

    private String escapeHtml(String text) {
        if (text == null) {
            return "";
        }
        return text.replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;");
    }

    private void showPlayerInfo() {
        String joinLink = playerServer.getHostedJoinLink();
        String hostedUi = playerServer.getHostedPlayerUiUrl();
        String localEndpoint = playerServer.getLocalEndpointUrl();
        JOptionPane.showMessageDialog(
                this,
                "Spieler können unter " + joinLink + " beitreten und dort direkt teilnehmen.\n"
                        + "Falls der Link nicht funktioniert, öffnet " + hostedUi + "\n"
                        + "und tragt als Server-Adresse \"" + localEndpoint + "\" ein.",
                "Spielerserver gestartet",
                JOptionPane.INFORMATION_MESSAGE
        );
    }
}
