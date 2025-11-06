package dhbw.dgp;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;

/**
 * Class for managing game configurations
 */
public class ConfiguratorOverview {
    private List<Configuration> configurations;
    private Configuration currentConfiguration;

    /**
     * Constructor that initializes the configurations list and loads configurations from the database
     */
    public ConfiguratorOverview() {
        this.configurations = new ArrayList<>();
        loadConfigurationsFromDatabase();
    }

    /**
     * Loads configurations from the database
     */
    private void loadConfigurationsFromDatabase() {
        this.configurations = DatabaseConnector.loadConfigurations();
    }

    /**
     * Saves the current configuration to the database
     */
    public void saveConfigurationToDatabase() {
        if (currentConfiguration != null) {
            DatabaseConnector.saveConfiguration(currentConfiguration);
        }
    }

    /**
     * Creates a new configuration with the given title
     * @return The newly created configuration
     */
    public ConfigurationBuilder createNewConfiguration(String title, int questionsPerCategory) {
        var builder = ConfigurationBuilder.createConfiguration();
        builder.setTitle(title);
        builder.setNumberOfQuestions(questionsPerCategory);
        this.currentConfiguration = builder.getConfiguration();
        configurations.add(currentConfiguration);
        return builder;
    }

    public ConfigurationBuilder createNewConfiguration() {
        return createNewConfiguration("Neue Konfiguration", 3);
    }

    /**
     * Edits an existing configuration
     */
    public void editConfiguration(Configuration configuration) {
        if (configuration != null && configurations.contains(configuration)) {
            this.currentConfiguration = configuration;
        }
    }

    /**
     * Duplicates an existing configuration
     * @return The duplicated configuration
     */
    public Configuration duplicateConfiguration() {
        if (currentConfiguration == null) {
            return null;
        }
        Configuration copy = copyConfiguration(currentConfiguration);
        copy.setTitle(currentConfiguration.getTitle() + " (Kopie)");
        configurations.add(copy);
        return copy;
    }

    /**
     * Deletes a configuration
     * @return True if the configuration was deleted, false otherwise
     */
    public boolean deleteConfiguration() {
        return configurations.remove(currentConfiguration);
    }

    /**
     * Gets the list of all configurations
     * @return The list of configurations
     */
    public List<Configuration> getConfigurations() {
        return configurations;
    }

    public Configuration getCurrentConfiguration() {
        return currentConfiguration;
    }

    public void setCurrentConfiguration(Configuration configuration) {
        this.currentConfiguration = configuration;
    }

    private Configuration copyConfiguration(Configuration configuration) {
        Configuration copy = new Configuration(configuration.getTitle());
        for (Category category : configuration.getCategories()) {
            Map<Integer, Question> questionMap = new TreeMap<>();
            for (Map.Entry<Integer, Question> entry : category.getPointQuestionMap().entrySet()) {
                questionMap.put(entry.getKey(), entry.getValue().copy());
            }
            copy.addCategory(new Category(category.getName(), questionMap));
        }
        return copy;
    }
}
