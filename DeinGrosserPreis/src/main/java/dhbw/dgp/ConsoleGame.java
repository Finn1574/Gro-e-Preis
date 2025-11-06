package dhbw.dgp;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Scanner;
import java.util.stream.Collectors;

/**
 * Simple console-based implementation of the quiz game.
 */
public class ConsoleGame {
    private final Scanner scanner;
    private final GameManager gameManager;
    private final ConfiguratorOverview configuratorOverview;

    public ConsoleGame() {
        this.scanner = new Scanner(System.in);
        this.gameManager = new GameManager();
        this.configuratorOverview = new ConfiguratorOverview();
    }

    public void run() {
        System.out.println("Willkommen bei \"Der Große Preis\"!");
        Configuration configuration = selectConfiguration();
        gameManager.loadGame(configuration);
        setupTeams();

        if (gameManager.getTeams().isEmpty()) {
            System.out.println("Keine Teams angelegt. Spiel wird beendet.");
            return;
        }

        gameLoop();
        showFinalScores();
    }

    private Configuration selectConfiguration() {
        List<Configuration> configurations = configuratorOverview.getConfigurations();
        if (configurations.isEmpty()) {
            ConfigurationBuilder builder = configuratorOverview.createNewConfiguration();
            builder.setTitle("Ad-hoc Spiel");
            configuratorOverview.setCurrentConfiguration(builder.getConfiguration());
            return builder.getConfiguration();
        }

        System.out.println("\nVerfügbare Konfigurationen:");
        for (int i = 0; i < configurations.size(); i++) {
            System.out.printf(" %d) %s%n", i + 1, configurations.get(i).getTitle());
        }

        int selection = readInt("Bitte Konfiguration wählen: ", 1, configurations.size());
        Configuration configuration = configurations.get(selection - 1);
        configuratorOverview.setCurrentConfiguration(configuration);
        return configuration;
    }

    private void setupTeams() {
        System.out.println("\n=== Team Setup ===");
        int teamCount = readInt("Wie viele Teams spielen mit? ", 1, 6);

        for (int i = 1; i <= teamCount; i++) {
            System.out.printf("Name für Team %d: ", i);
            String name = readNonEmptyLine();
            gameManager.createTeam(name);
        }

        System.out.println();
    }

    private void gameLoop() {
        while (gameManager.hasAvailableQuestions()) {
            Team currentTeam = gameManager.getCurrentTeam();
            if (currentTeam == null) {
                break;
            }

            System.out.printf("=== Runde für Team \"%s\" ===%n", currentTeam.getName());
            showScoreboard();
            Category category = chooseCategory();
            if (category == null) {
                System.out.println("Keine Kategorie ausgewählt. Runde wird übersprungen.");
                gameManager.nextTeam();
                continue;
            }

            int points = choosePoints(category);
            Question question = gameManager.getGameOverview().getQuestion(category, points);
            if (question == null) {
                System.out.println("Keine Frage für diese Auswahl gefunden.");
                gameManager.nextTeam();
                continue;
            }

            presentQuestion(question);
            int answerIndex = readInt("Bitte Antwortnummer eingeben: ", 1, question.getNumberOfAnswers()) - 1;
            String givenAnswer = question.getAnswers().get(answerIndex);

            boolean correct = gameManager.answerQuestion(category, points, currentTeam, givenAnswer);
            if (correct) {
                System.out.printf("Richtig! %d Punkte für %s.%n", points, currentTeam.getName());
            } else {
                System.out.printf("Leider falsch. Die richtige Antwort lautet: %s%n", question.getCorrectAnswer());
            }

            if (!gameManager.hasAvailableQuestions()) {
                break;
            }

            gameManager.nextTeam();
            System.out.println();
        }
    }

    private void showScoreboard() {
        System.out.println("Aktueller Punktestand:");
        List<Map.Entry<Team, Integer>> leaderboard = gameManager.getPointsManager().getLeaderboard();
        if (leaderboard.isEmpty()) {
            gameManager.getTeams().forEach(team -> System.out.printf(" - %s: 0%n", team.getName()));
            return;
        }

        for (Map.Entry<Team, Integer> entry : leaderboard) {
            System.out.printf(" - %s: %d%n", entry.getKey().getName(), entry.getValue());
        }
    }

    private Category chooseCategory() {
        List<Category> selectableCategories = new ArrayList<>();
        Map<Category, List<Integer>> availableQuestions = gameManager.getGameOverview().getAvailableQuestions();
        int index = 1;
        System.out.println("Verfügbare Kategorien:");
        for (Category category : gameManager.getConfiguration().getCategories()) {
            List<Integer> points = availableQuestions.get(category);
            if (points == null || points.isEmpty()) {
                continue;
            }
            selectableCategories.add(category);
            String pointsText = points.stream()
                    .map(String::valueOf)
                    .collect(Collectors.joining(", "));
            System.out.printf(" %d) %s (%s)%n", index++, category.getName(), pointsText);
        }

        if (selectableCategories.isEmpty()) {
            return null;
        }

        int selection = readInt("Kategorie wählen: ", 1, selectableCategories.size());
        return selectableCategories.get(selection - 1);
    }

    private int choosePoints(Category category) {
        List<Integer> available = gameManager.getAvailableQuestionsForCategory(category);
        System.out.printf("Verfügbare Punktezahlen für \"%s\": %s%n",
                category.getName(),
                available.stream().map(String::valueOf).collect(Collectors.joining(", ")));
        int min = available.stream().mapToInt(Integer::intValue).min().orElseThrow();
        int max = available.stream().mapToInt(Integer::intValue).max().orElseThrow();
        return readInt("Punktzahl wählen: ", min, max, available);
    }

    private void presentQuestion(Question question) {
        System.out.println("\nFrage:");
        System.out.println(question.getQuestion());
        List<String> answers = question.getAnswers();
        for (int i = 0; i < answers.size(); i++) {
            System.out.printf(" %d) %s%n", i + 1, answers.get(i));
        }
    }

    private void showFinalScores() {
        System.out.println("\n=== Endstand ===");
        List<Map.Entry<Team, Integer>> leaderboard = gameManager.getPointsManager().getLeaderboard();
        if (leaderboard.isEmpty()) {
            System.out.println("Keine Punkte vergeben.");
            return;
        }

        for (int i = 0; i < leaderboard.size(); i++) {
            Map.Entry<Team, Integer> entry = leaderboard.get(i);
            System.out.printf("%d. %s – %d Punkte%n", i + 1, entry.getKey().getName(), entry.getValue());
        }

        System.out.println("\nVielen Dank fürs Spielen!");
        scanner.close();
    }

    private int readInt(String prompt, int min, int max) {
        while (true) {
            System.out.print(prompt);
            String line = scanner.nextLine().trim();
            try {
                int value = Integer.parseInt(line);
                if (value < min || value > max) {
                    System.out.printf("Bitte eine Zahl zwischen %d und %d eingeben.%n", min, max);
                    continue;
                }
                return value;
            } catch (NumberFormatException ex) {
                System.out.println("Ungültige Eingabe, bitte erneut versuchen.");
            }
        }
    }

    private int readInt(String prompt, int min, int max, List<Integer> allowedValues) {
        while (true) {
            int value = readInt(prompt, min, max);
            if (allowedValues.contains(value)) {
                return value;
            }
            System.out.println("Diese Punktzahl ist nicht verfügbar.");
        }
    }

    private String readNonEmptyLine() {
        while (true) {
            String line = scanner.nextLine().trim();
            if (!line.isEmpty()) {
                return line;
            }
            System.out.print("Bitte einen Wert eingeben: ");
        }
    }
}
