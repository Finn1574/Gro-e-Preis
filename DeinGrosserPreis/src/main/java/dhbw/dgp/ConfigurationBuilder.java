package dhbw.dgp;

public class ConfigurationBuilder {
    private Configuration configuration;
    private CategoryBuilder categoryBuilder;

    /**
     * Static method to create a new Configuration object
     * @return A new Configuration object with the given title
     */
    public static ConfigurationBuilder createConfiguration() {
        ConfigurationBuilder configurationBuilder = new ConfigurationBuilder();
        return configurationBuilder;
    }

    /**
     * Default constructor that initializes with default values
     */
    private ConfigurationBuilder() {
        this.configuration = new Configuration("");
        this.categoryBuilder = new CategoryBuilder(configuration, 3);
    }

    /**
     * Sets the title of the configuration
     * @param title The new title
     */
    public void setTitle(String title) {
        this.configuration.setTitle(title);
    }

    /**
     * Sets the number of questions per category
     * @param numberOfQuestions The new number of questions
     */
    public void setNumberOfQuestions(int numberOfQuestions) {
        this.categoryBuilder.setNumberOfQuestions(numberOfQuestions);
    }

    /**
     * Creates a new category with the given name and adds it to the configuration
     * @param name The name of the category
     */
    public Category createNewCategory(String name) {
        return categoryBuilder.createNewCategory(name);
    }

    public Configuration getConfiguration() {
        return this.configuration;
    }

    public CategoryBuilder getCategoryBuilder() {
        return categoryBuilder;
    }
}
