package dhbw.dgp;

import java.util.ArrayList;
import java.util.List;

public class Team {
    private String name;
    private List<String> players;

    public Team(String name) {
        this.name = name;
        this.players = new ArrayList<>();
    }

    public void addPlayer(String playerName) {
        players.add(playerName);
    }

    public String getName() {
        return name;
    }

    public List<String> getPlayers() {
        return players;
    }
}
