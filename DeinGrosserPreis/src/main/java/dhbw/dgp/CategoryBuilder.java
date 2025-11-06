package dhbw.dgp;

import java.util.Map;
import java.util.TreeMap;

public class CategoryBuilder {
   private Configuration configuration;
   private int numberOfQuestions;

   /**
    * Constructor that takes a Configuration object
    * @param configuration The configuration to add categories to
    */
   public CategoryBuilder(Configuration configuration, int numberOfQuestions) {
       this.configuration = configuration;
       this.numberOfQuestions = numberOfQuestions;
   }

   /**
    * Sets the number of questions per category
    * @param numberOfQuestions The new number of questions
    */
   public void setNumberOfQuestions(int numberOfQuestions) {
       this.numberOfQuestions = numberOfQuestions;
   }

   /**
    * Creates a new category with the specified number of questions
    * and adds it to the configuration
    * @param name The name of the category
    * @return The newly created category
    */
   public Category createNewCategory(String name){
       Map<Integer, Question> questionsMap = new TreeMap<>();

       // Create mappings with points (10, 20, 30, ...) and empty Question objects
       for (int i = 1; i <= numberOfQuestions; i++) {
           int points = i * 10;
           questionsMap.put(points, new Question(3)); // Create empty Question with default 3 answers
       }

       Category category = new Category(name, questionsMap);

       // Add the newly created category to the configuration
       configuration.addCategory(category);
       return category;
   }
}
