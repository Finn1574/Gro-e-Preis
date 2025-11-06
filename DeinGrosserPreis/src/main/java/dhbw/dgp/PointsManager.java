package dhbw.dgp;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

public class PointsManager {
    private Map<Team, Integer> teamPoints;

    public PointsManager() {
        this.teamPoints = new HashMap<>();
    }

    /**
     * Adds a team to the points manager with 0 points
     * @param team The team to add
     */
    public void addTeam(Team team) {
        teamPoints.put(team, 0);
    }

    /**
     * Updates the points for a team
     * @param team The team to update
     * @param points The new points value
     */
    public void updatePoints(Team team, int points) {
        teamPoints.put(team, points);
    }

    /**
     * Adds points to a team's current total
     * @param team The team to add points to
     * @param points The points to add
     */
    public void addPoints(Team team, int points) {
        int currentPoints = getPoints(team);
        teamPoints.put(team, currentPoints + points);
    }

    /**
     * Gets the points for a team
     * @param team The team to get points for
     * @return The team's points
     */
    public int getPoints(Team team) {
        return teamPoints.getOrDefault(team, 0);
    }

    /**
     * Gets the map of all team points
     * @return The map of team points
     */
    public Map<Team, Integer> getAllTeamPoints() {
        return Map.copyOf(teamPoints);
    }

    /**
     * @return leaderboard entries sorted descending by points
     */
    public List<Map.Entry<Team, Integer>> getLeaderboard() {
        return teamPoints.entrySet()
                .stream()
                .sorted((a, b) -> Integer.compare(b.getValue(), a.getValue()))
                .collect(Collectors.toList());
    }
}
