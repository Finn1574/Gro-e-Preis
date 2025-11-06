package dhbw.dgp;

/**
 * Class for editing questions in the game
 */
public class QuestionEditor {
    // The question currently being edited, identified by category and points
    private Question currentQuestionInEditing;

    /**
     * Sets the question to be edited
     * @param category The category of the question
     * @param points The point value of the question
     * @return The question to be edited, or null if not found
     */
    public Question setQuestionInEditing(Category category, int points) {
        if (category == null || !category.getPointQuestionMap().containsKey(points)) {
            // Reset current editing state if invalid parameters
            this.currentQuestionInEditing = null;
            return null;
        }

        this.currentQuestionInEditing = category.getPointQuestionMap().get(points);
        return this.currentQuestionInEditing;
    }


    /**
     * Clears the current editing state
     */
    public void clearQuestionInEditing() {
        this.currentQuestionInEditing = null;
    }

    public Question getCurrentQuestionInEditing() {
        return currentQuestionInEditing;
    }

    public void updateQuestionText(String text) {
        if (currentQuestionInEditing != null) {
            currentQuestionInEditing.setQuestion(text);
        }
    }

    public void updateAnswer(int index, String answer) {
        if (currentQuestionInEditing != null) {
            currentQuestionInEditing.setAnswer(index, answer);
        }
    }

    public void setCorrectAnswerIndex(int index) {
        if (currentQuestionInEditing != null) {
            currentQuestionInEditing.setCorrectAnswerIndex(index);
        }
    }
}
