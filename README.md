# Der Große Preis

Eine Echtzeit-Quizshow mit getrennten Host- und Player-Ansichten. Der Host authentifiziert sich per Passwort, erstellt eine Spielsitzung und steuert das Frageboard. Spieler treten über einen QR-Code bei, erhalten Fragen live und geben Antworten in Echtzeit ab.

## Projektstruktur

```
.
├── server/           # Node.js + Express + Socket.IO Backend (TypeScript)
│   ├── src/
│   └── questions.txt # 100 Fragen im Pipe-Format
└── web/              # React + Vite Frontend (TypeScript)
```

## Setup

1. **Repository vorbereiten**

   ```bash
   npm install
   cp .env.example .env
   ```

   Passe die Werte in `.env` bei Bedarf an:

   | Variable       | Beschreibung                                 |
   | -------------- | --------------------------------------------- |
   | `HOST_PASSWORD`| Passwort für `/host/login` (Standard `007`)   |
   | `BASE_URL`     | Öffentliche Basis-URL des Frontends          |
   | `PORT`         | Port des Express-Servers (Standard `4000`)   |
   | `SESSION_SECRET` | Secret für die Session-Cookies              |

2. **Entwicklungsserver starten**

   Backend:

   ```bash
   npm run dev:server
   ```

   Frontend (neues Terminal):

   ```bash
   npm run dev:web
   ```

   Alternativ kannst du beide Server parallel starten:

   ```bash
   npm run dev:all
   ```

3. **Frontend öffnen**

   Rufe `http://localhost:5173` (oder `BASE_URL`) im Browser auf.

## Kernfunktionen

- **Host-Flow**
  - Login unter `/host/login` (Passwort aus `.env`).
  - Dashboard mit Einstiegspunkten zu Start, AI Settings (Placeholder) und Game Settings (Placeholder).
  - Startseite generiert ein Spiel (`gameId`), zeigt QR-Code und Join-Link an.
  - Fragenboard (`/host/board`) zeigt 5×5 Punktefeld; beantwortete Felder werden grün/rot markiert.
  - Fragenansicht (`/host/question/:qid`) zeigt Optionen, erlaubt das Senden einer Bestätigung und kehrt zum Board zurück.

- **Player-Flow**
  - QR-Link `/play/join?gameId=<id>` führt zur Namenseingabe.
  - Warten-Ansicht empfängt Fragen per Socket.IO (`player:question`).
  - Fragenansicht zeigt Optionen A–D; nach Antwort werden Eingaben gesperrt und Ergebnis angezeigt.

- **Echtzeit**
  - Socket.IO-Räume pro `gameId` für Host und Spieler.
  - Events laut Spezifikation (`host:createGame`, `player:join`, `host:selectQuestion`, `player:answer` usw.).
  - Server validiert Antworten anhand `questions.txt` und aktualisiert den Board-Status.

## Fragen-Datei

`server/questions.txt` enthält 100 Einträge im Format:

```
QID|POINTS|QUESTION|A|B|C|D|ANSWER
```

Beispiel:

```
q001|100|Welche Farbe hat die Flagge Deutschlands?|Schwarz-Rot-Gold|Blau-Weiß|Rot-Weiß|Grün-Gelb|A
```

Der Server lädt und validiert die Datei beim Start. Die ersten 25 Fragen (deterministisch per `gameId` gemischt) bilden das 5×5-Board.

## Skripte

| Befehl            | Zweck                                   |
| ----------------- | ---------------------------------------- |
| `npm run dev`     | Startet das Vite-Frontend                |
| `npm run dev:web` | Alias für das Frontend                   |
| `npm run dev:server` | Startet den Express/Socket.IO-Server |
| `npm run dev:all` | Startet Frontend und Backend parallel    |
| `npm run --workspace server build` | TypeScript-Compile Server |

## Hinweise

- Sitzungen werden über Cookies gehalten; Browser muss Cookies erlauben.
- CORS ist für das im `.env` definierte `BASE_URL` freigeschaltet.
- Für die Produktion sollten Sessions in einem persistenten Store gesichert und HTTPS verwendet werden.
