package dhbw.dgp;

import java.util.ArrayList;
import java.util.List;

public class GameManager {
    private Configuration configuration;
    private List<Team> teams;
    private int currentTeamIndex;
    private PointsManager pointsManager;
    private GameOverview gameOverview;

    public GameManager() {
        this.teams = new ArrayList<>();
        this.currentTeamIndex = -1;
        this.pointsManager = new PointsManager();
        this.gameOverview = new GameOverview();
    }

    /**
     * Loads a game configuration
     * @param configuration The configuration to load
     */
    public void loadGame(Configuration configuration) {
        this.configuration = configuration;

        // Initialize the game overview with categories from the configuration
        this.gameOverview = new GameOverview();
        if (configuration != null) {
            for (Category category : configuration.getCategories()) {
                gameOverview.addCategory(category);
            }
        }
    }

    /**
     * Creates a new team and adds it to the list of teams
     * @param name The name of the team
     * @return The created team
     */
    public void createTeam(String name) {
        Team team = new Team(name);
        teams.add(team);
        pointsManager.addTeam(team);
        if (currentTeamIndex == -1) {
            currentTeamIndex = 0;
        }
    }

    /**
     * Gets the currently active team
     * @return The active team
     */
    public Team getCurrentTeam() {
        if (teams.isEmpty() || currentTeamIndex < 0) {
            return null;
        }
        return teams.get(currentTeamIndex);
    }

    public List<Team> getTeams() {
        return teams;
    }

    /**
     * Sets the next team as active in a round-robin fashion
     * If there are no more available questions, calls FinishGame
     */
    public void nextTeam() {
        if (teams.isEmpty()) {
            return;
        }

        if (!gameOverview.hasAvailableQuestions()) {
            FinishGame();
            return;
        }

        currentTeamIndex = (currentTeamIndex + 1) % teams.size();
    }

    /**
     * Answers a question for the current team.
     * @param category the category that contains the question
     * @param points   the point value of the question
     * @param givenAnswer answer provided by the team
     * @return true when the answer was correct and points awarded
     */
    public boolean answerQuestion(Category category, int points, String givenAnswer) {
        Team current = getCurrentTeam();
        if (current == null) {
            throw new IllegalStateException("No team available to answer questions");
        }
        return answerQuestion(category, points, current, givenAnswer);
    }

    /**
     * Answers a question for the given team.
     * @param category category containing the question
     * @param points point value
     * @param team team providing the answer
     * @param givenAnswer answer text selected by the team
     * @return true when the answer was correct and points were awarded
     */
    public boolean answerQuestion(Category category, int points, Team team, String givenAnswer) {
        if (category == null) {
            throw new IllegalArgumentException("category must not be null");
        }
        if (team == null) {
            throw new IllegalArgumentException("team must not be null");
        }
        if (!teams.contains(team)) {
            throw new IllegalArgumentException("Unknown team: " + team.getName());
        }

        Question question = gameOverview.getQuestion(category, points);
        if (question == null) {
            return false;
        }

        boolean isCorrect = question.isCorrectAnswer(givenAnswer);
        boolean marked = gameOverview.markQuestionAsAnswered(category, points);

        if (marked && isCorrect) {
            pointsManager.addPoints(team, points);
        }

        return isCorrect;
    }

    public Category getCategoryByName(String name) {
        if (configuration == null) {
            return null;
        }
        for (Category category : configuration.getCategories()) {
            if (category.getName().equalsIgnoreCase(name)) {
                return category;
            }
        }
        return null;
    }

    public List<Integer> getAvailableQuestionsForCategory(Category category) {
        List<Integer> available = gameOverview.getAvailableQuestions().get(category);
        return (available == null) ? List.of() : List.copyOf(available);
    }

    public boolean hasAvailableQuestions() {
        return gameOverview.hasAvailableQuestions();
    }

    public int getPointsForTeam(Team team) {
        return pointsManager.getPoints(team);
    }

    public PointsManager getPointsManager() {
        return pointsManager;
    }

    public Configuration getConfiguration() {
        return configuration;
    }

    public GameOverview getGameOverview() {
        return gameOverview;
    }

    public Team getTeamByName(String name) {
        if (name == null) {
            return null;
        }
        for (Team team : teams) {
            if (team.getName().equalsIgnoreCase(name.trim())) {
                return team;
            }
        }
        return null;
    }

    /**
     * Called when the game is finished (no more available questions)
     */
    public void FinishGame() {
        // This method is called when the game is finished
        // Implementation can be added as needed
    }
}
