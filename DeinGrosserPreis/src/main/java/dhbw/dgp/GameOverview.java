package dhbw.dgp;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Class that manages the game overview including categories and questions
 */
public class GameOverview {
    private List<Category> categories;

    // Collection for new questions (not yet answered)
    // Maps each category to a list of point values for available questions
    private Map<Category, List<Integer>> availableQuestions;

    // Collection for answered questions
    // Maps each category to a list of point values for answered questions
    private Map<Category, List<Integer>> answeredQuestions;

    /**
     * Constructor for GameOverview
     */
    public GameOverview() {
        this.categories = new ArrayList<>();
        this.availableQuestions = new HashMap<>();
        this.answeredQuestions = new HashMap<>();
    }

    /**
     * Adds a category to the game overview
     * @param category The category to add
     */
    public void addCategory(Category category) {
        categories.add(category);

        // Initialize the lists for new questions with all available point values
        List<Integer> pointsList = new ArrayList<>(category.getPointQuestionMap().keySet());
        Collections.sort(pointsList);
        availableQuestions.put(category, pointsList);

        // Initialize empty list for answered questions
        answeredQuestions.put(category, new ArrayList<>());
    }

    /**
     * Marks a question as answered
     * @param category The category of the question
     * @param points The point value of the question
     * @return true if the question was successfully marked as answered, false otherwise
     */
    public boolean markQuestionAsAnswered(Category category, int points) {
        // Check if the category exists and the question is available (not yet answered)
        if (availableQuestions.containsKey(category) && availableQuestions.get(category).contains(points)) {
            // Remove from new questions
            availableQuestions.get(category).remove(Integer.valueOf(points));

            // Add to answered questions
            answeredQuestions.get(category).add(points);

            return true;
        }
        return false;
    }

    /**
     * Gets the question for a specific category and point value
     * @param category The category
     * @param points The point value
     * @return The question or null if not found
     */
    public Question getQuestion(Category category, int points) {
        if (category != null && category.getPointQuestionMap().containsKey(points)) {
            return category.getPointQuestionMap().get(points);
        }
        return null;
    }

    /**
     * Gets all categories
     * @return List of categories
     */
    public List<Category> getCategories() {
        return categories;
    }

    /**
     * Gets the map of new (unanswered) questions
     * @return Map of categories to lists of point values
     */
    public Map<Category, List<Integer>> getAvailableQuestions() {
        return availableQuestions;
    }

    /**
     * Gets the map of answered questions
     * @return Map of categories to lists of point values
     */
    public Map<Category, List<Integer>> getAnsweredQuestions() {
        return answeredQuestions;
    }

    public boolean hasAvailableQuestions() {
        for (List<Integer> points : availableQuestions.values()) {
            if (!points.isEmpty()) {
                return true;
            }
        }
        return false;
    }
}
