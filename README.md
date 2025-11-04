# Der Große Preis (Static Edition)

Diese Variante des Quiz-Spiels läuft vollständig im Browser – ohne Server, ohne Build-Tools. Alle Daten werden per
`localStorage` zwischen offenen Tabs des gleichen Browsers synchronisiert. Damit lässt sich der Host- und Player-Flow
zumindest lokal (z. B. in unterschiedlichen Browserfenstern) ausprobieren.

## Dateien

```
index.html       – Landingpage
host.html        – Host-Konsole mit Login, QR-Link, Spielfeld und Bewertungs-Modal
player.html      – Player-Konsole zum Beitreten und Antworten
styles/main.css  – Gemeinsames Styling
scripts/*.js     – Browser-Logik (ES-Module)
data/questions.txt – 100 Fragen (Pipe-getrennt)
```

## Nutzung

1. Projekt als statische Dateien z. B. in GitHub Pages oder lokal mit einem simplen HTTP-Server bereitstellen.
2. `host.html` öffnen, mit Passwort `007` einloggen und ein neues Spiel erstellen.
3. Spieler `player.html` öffnen und mit Spiel-ID (oder QR-Link) beitreten.
4. Fragen auswählen, Antworten abwarten, Ergebnisse prüfen.

> Hinweis: Da kein echter Backend- oder Netzwerksync existiert, müssen Host und Player im selben Browser/Origin laufen.
> Für ein echtes Mehrbenutzer-Erlebnis wäre weiterhin eine Server-Komponente erforderlich.
