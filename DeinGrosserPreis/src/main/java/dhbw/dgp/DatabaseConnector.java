package dhbw.dgp;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.TreeMap;

/**
 * Class for handling database operations related to configurations
 */
public class DatabaseConnector {
    private static final List<Configuration> IN_MEMORY_CONFIGURATIONS = new ArrayList<>();

    static {
        IN_MEMORY_CONFIGURATIONS.add(createSampleConfiguration());
    }

    /**
     * Loads configurations from the database
     * @return List of Configuration objects loaded from the database
     */
    public static List<Configuration> loadConfigurations() {
        List<Configuration> configurations = new ArrayList<>();
        for (Configuration configuration : IN_MEMORY_CONFIGURATIONS) {
            configurations.add(copyConfiguration(configuration));
        }
        configurations.sort(Comparator.comparing(Configuration::getTitle));
        return configurations;
    }

    /**
     * Saves a configuration to the database
     * @param configuration The Configuration object to save
     */
    public static void saveConfiguration(Configuration configuration) {
        if (configuration == null) {
            return;
        }

        Optional<Configuration> existing = IN_MEMORY_CONFIGURATIONS.stream()
                .filter(cfg -> cfg.getTitle().equalsIgnoreCase(configuration.getTitle()))
                .findFirst();

        Configuration copy = copyConfiguration(configuration);

        existing.ifPresentOrElse(cfg -> {
            IN_MEMORY_CONFIGURATIONS.remove(cfg);
            IN_MEMORY_CONFIGURATIONS.add(copy);
        }, () -> IN_MEMORY_CONFIGURATIONS.add(copy));
    }

    private static Configuration copyConfiguration(Configuration configuration) {
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

    private static Configuration createSampleConfiguration() {
        Configuration configuration = new Configuration("Der Große Preis – Standard");

        configuration.addCategory(createCategory("Geographie", new String[][]{
                {"10", "Welche Stadt ist die Hauptstadt von Frankreich?", "Paris", "Berlin", "Rom", "Madrid", "0"},
                {"20", "Welcher Fluss fließt durch Budapest?", "Donau", "Elbe", "Themse", "Rhein", "0"},
                {"30", "Welcher Kontinent hat die meisten Länder?", "Afrika", "Europa", "Asien", "Südamerika", "0"}
        }));

        configuration.addCategory(createCategory("Wissenschaft", new String[][]{
                {"10", "Welche chemische Formel hat Wasser?", "H2O", "CO2", "NaCl", "O2", "0"},
                {"20", "Wie viele Planeten hat unser Sonnensystem?", "8", "7", "9", "10", "0"},
                {"30", "Wie heißt der Prozess, bei dem Pflanzen Licht in Energie umwandeln?", "Photosynthese", "Fermentation", "Metabolismus", "Osmose", "0"}
        }));

        configuration.addCategory(createCategory("Sport", new String[][]{
                {"10", "Wie viele Spieler stehen beim Fußball pro Team auf dem Platz?", "11", "9", "10", "12", "0"},
                {"20", "In welcher Sportart ist Serena Williams eine Legende?", "Tennis", "Basketball", "Golf", "Leichtathletik", "0"},
                {"30", "Welches Land richtete die Olympischen Spiele 2016 aus?", "Brasilien", "China", "Großbritannien", "Griechenland", "0"}
        }));

        return configuration;
    }

    private static Category createCategory(String name, String[][] data) {
        Map<Integer, Question> questions = new TreeMap<>();
        for (String[] row : data) {
            int points = Integer.parseInt(row[0]);
            String prompt = row[1];
            List<String> answers = List.of(row[2], row[3], row[4], row[5]);
            int correctIndex = Integer.parseInt(row[6]);
            questions.put(points, new Question(prompt, answers, correctIndex));
        }
        return new Category(name, questions);
    }
}
