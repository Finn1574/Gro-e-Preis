package dhbw.dgp;

import java.util.ArrayList;
import java.util.List;

public class Configuration {
    private String title;
    private List<Category> categories;

    public Configuration(String title) {
        this.title = title;
        this.categories = new ArrayList<>();
    }

    /**
     * Gets the title of the configuration
     * @return The title
     */
    public String getTitle() {
        return title;
    }

    /**
     * Sets the title of the configuration
     * @param title The new title
     */
    public void setTitle(String title) {
        this.title = title;
    }

    /**
     * Gets the list of categories
     * @return The list of categories
     */
    public List<Category> getCategories() {
        return categories;
    }

    /**
     * Adds a category to the configuration
     * @param category The category to add
     */
    public void addCategory(Category category) {
        this.categories.add(category);
    }
}