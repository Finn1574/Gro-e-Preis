package dhbw.dgp;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Objects;

public class Question {
    private String prompt;
    private final List<String> answers;
    private int correctAnswerIndex;

    /**
     * Constructor for Question class
     * @param count Number of answers, defaults to 3 if null
     */
    public Question(Integer count) {
        int numberOfAnswers = (count != null && count > 0) ? count : 3;
        this.answers = new ArrayList<>(numberOfAnswers);
        for (int i = 0; i < numberOfAnswers; i++) {
            answers.add("");
        }
        this.correctAnswerIndex = 0;
    }

    /**
     * Convenience constructor for fully initialised questions.
     */
    public Question(String prompt, List<String> answers, int correctAnswerIndex) {
        Objects.requireNonNull(answers, "answers");
        if (answers.isEmpty()) {
            throw new IllegalArgumentException("answers must not be empty");
        }
        this.prompt = prompt;
        this.answers = new ArrayList<>(answers);
        setCorrectAnswerIndex(correctAnswerIndex);
    }

    /**
     * Sets the question text
     * @param question The question text
     */
    public void setQuestion(String question) {
        this.prompt = question;
    }

    /**
     * Sets an answer at the specified position
     * @param position The position of the answer (0-based index)
     * @param answer The answer text
     */
    public void setAnswer(int position, String answer) {
        if (position >= 0 && position < answers.size()) {
            answers.set(position, answer);
        }
    }

    /**
     * Sets the index of the correct answer.
     * @param index index in the answers list
     */
    public void setCorrectAnswerIndex(int index) {
        if (index < 0 || index >= answers.size()) {
            throw new IllegalArgumentException("Correct answer index out of bounds: " + index);
        }
        this.correctAnswerIndex = index;
    }

    /**
     * @return immutable view of answer options
     */
    public List<String> getAnswers() {
        return Collections.unmodifiableList(answers);
    }

    public String getQuestion() {
        return prompt;
    }

    public int getCorrectAnswerIndex() {
        return correctAnswerIndex;
    }

    public String getCorrectAnswer() {
        return answers.get(correctAnswerIndex);
    }

    /**
     * Checks whether the provided answer matches the correct answer.
     * Comparison is case-insensitive and ignores leading/trailing whitespace.
     */
    public boolean isCorrectAnswer(String givenAnswer) {
        if (givenAnswer == null) {
            return false;
        }
        return getCorrectAnswer().trim().equalsIgnoreCase(givenAnswer.trim());
    }

    public int getNumberOfAnswers() {
        return answers.size();
    }

    public void setAnswers(List<String> newAnswers, int correctIndex) {
        answers.clear();
        if (newAnswers == null || newAnswers.isEmpty()) {
            throw new IllegalArgumentException("answers must not be empty");
        }
        answers.addAll(newAnswers);
        setCorrectAnswerIndex(correctIndex);
    }

    public Question copy() {
        Question copy = new Question(getQuestion(), new ArrayList<>(answers), correctAnswerIndex);
        return copy;
    }
}
