package dhbw.dgp;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;

public class Category {
    private Map<Integer, Question> pointQuestionMap;
    private String name;

    public Category(String name, Map<Integer, Question> questionsMap) {
        this.name = name;
        this.pointQuestionMap = questionsMap;
    }

    public Question getQuestion(int points) {
        return pointQuestionMap.get(points);
    }

    public void addOrReplaceQuestion(int points, Question question) {
        pointQuestionMap.put(points, question);
    }

    /**
     * Gets the map of point values with their questions
     * @return Map of Integer points to Question objects
     */
    public Map<Integer, Question> getPointQuestionMap() {
        return pointQuestionMap;
    }

    public List<Integer> getPointValues() {
        List<Integer> points = new ArrayList<>(pointQuestionMap.keySet());
        Collections.sort(points);
        return points;
    }

    /**
     * Gets the name of the category
     * @return The name of the category
     */
    public String getName() {
        return name;
    }
}
