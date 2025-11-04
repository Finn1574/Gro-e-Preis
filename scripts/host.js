const gameData = {
  title: "Der Große Preis",
  categories: [
    {
      name: "Allgemeinwissen",
      questions: [
        {
          points: 100,
          prompt: "Was ist die Hauptstadt von Österreich?",
          answer: "Wien"
        },
        {
          points: 200,
          prompt: "Welches chemische Symbol steht für Gold?",
          answer: "Au"
        },
        {
          points: 300,
          prompt: "Wie viele Kontinente gibt es auf der Erde?",
          answer: "Sieben"
        },
        {
          points: 400,
          prompt: "Welcher Planet ist der Sonne am nächsten?",
          answer: "Merkur"
        },
        {
          points: 500,
          prompt: "Welches Jahr gilt als Beginn der Französischen Revolution?",
          answer: "1789"
        }
      ]
    },
    {
      name: "Welt & Natur",
      questions: [
        {
          points: 100,
          prompt: "Wie nennt man junge Seesterne kurz nach der Metamorphose?",
          answer: "Seesternlarven"
        },
        {
          points: 200,
          prompt: "Welches Meer trennt Europa und Afrika?",
          answer: "Das Mittelmeer"
        },
        {
          points: 300,
          prompt: "Zu welcher Pflanzenfamilie gehört der Bambus?",
          answer: "Zu den Süßgräsern"
        },
        {
          points: 400,
          prompt: "Welcher Berg ist der höchste Afrikas?",
          answer: "Der Kilimandscharo"
        },
        {
          points: 500,
          prompt: "Welches Tier kann als einziges Säugetier dauerhaft fliegen?",
          answer: "Die Fledermaus"
        }
      ]
    },
    {
      name: "Kultur & Medien",
      questions: [
        {
          points: 100,
          prompt: "Wer schrieb das Theaterstück \"Faust\"?",
          answer: "Johann Wolfgang von Goethe"
        },
        {
          points: 200,
          prompt: "Wie heißt das weltweit größte Filmfestival in Deutschland?",
          answer: "Die Berlinale"
        },
        {
          points: 300,
          prompt: "Welches Instrument hat Tasten, Saiten und Hämmer?",
          answer: "Das Klavier"
        },
        {
          points: 400,
          prompt: "Welche Farbe dominiert in Wassily Kandinskys Gemälde \"Gelb-Rot-Blau\"?",
          answer: "Es handelt sich um eine Komposition aus den drei Primärfarben ohne dominante Einzeltonalität."
        },
        {
          points: 500,
          prompt: "Welche japanische Kunstform ist die hohe Schule des Blumensteckens?",
          answer: "Ikebana"
        }
      ]
    },
    {
      name: "Sport & Spiele",
      questions: [
        {
          points: 100,
          prompt: "Wie viele Spieler stehen bei einem Fußballspiel pro Team auf dem Platz?",
          answer: "Elf"
        },
        {
          points: 200,
          prompt: "In welcher Sportart wird der Davis Cup vergeben?",
          answer: "Im Tennis"
        },
        {
          points: 300,
          prompt: "Welcher deutsche Grand Prix Fahrer ist siebenfacher Formel-1-Weltmeister?",
          answer: "Michael Schumacher"
        },
        {
          points: 400,
          prompt: "Wie viele Punkte benötigt man mindestens, um beim Dart-Spiel \"501\" auf null zu kommen?",
          answer: "501 Punkte – man muss exakt null erreichen und mit einem Doppelsegment abschließen."
        },
        {
          points: 500,
          prompt: "Welches strategische Brettspiel wird auf einem 19x19-Gitter gespielt?",
          answer: "Go"
        }
      ]
    }
  ]
};

document.addEventListener("DOMContentLoaded", () => {
  const board = document.querySelector("[data-board]");
  const startButton = document.querySelector("[data-start-game]");
  const refreshButton = document.querySelector("[data-refresh-code]");
  const sessionCodeField = document.querySelector("[data-session-code]");
  const modal = document.querySelector("[data-question-modal]");
  const modalBackdrop = modal?.querySelector(".question-modal__backdrop");
  const modalCategory = modal?.querySelector("[data-question-category]");
  const modalPoints = modal?.querySelector("[data-question-points]");
  const modalTitle = modal?.querySelector("[data-question-title]");
  const modalText = modal?.querySelector("[data-question-text]");
  const modalAnswer = modal?.querySelector("[data-question-answer]");
  const modalAnswerText = modal?.querySelector("[data-answer-text]");
  const revealAnswerButton = modal?.querySelector("[data-reveal-answer]");
  const markCompleteButton = modal?.querySelector("[data-mark-complete]");
  const closeButtons = modal?.querySelectorAll("[data-modal-close]");

  let activeQuestion = null;

  const generateSessionCode = () => {
    const code = Math.floor(1000 + Math.random() * 9000);
    sessionCodeField.textContent = code.toString();
  };

  const renderBoard = () => {
    const columnCount = gameData.categories.length;
    board.innerHTML = "";
    board.style.setProperty("--board-columns", columnCount);

    const overlay = document.createElement("div");
    overlay.className = "board__overlay";
    overlay.innerHTML = `<p>Press <strong>Start Game</strong> to unlock the board.</p>`;
    board.appendChild(overlay);

    const grid = document.createElement("div");
    grid.className = "board__grid";
    board.appendChild(grid);

    const columnLabels = document.createElement("div");
    columnLabels.className = "board__header";
    grid.appendChild(columnLabels);

    gameData.categories.forEach((category, categoryIndex) => {
      const label = document.createElement("div");
      label.className = "board__column-title";
      label.textContent = category.name;
      columnLabels.appendChild(label);
    });

    const columnsWrapper = document.createElement("div");
    columnsWrapper.className = "board__columns";
    grid.appendChild(columnsWrapper);

    gameData.categories.forEach((category, categoryIndex) => {
      const column = document.createElement("div");
      column.className = "board__column";
      column.dataset.column = categoryIndex;

      category.questions.forEach((question, questionIndex) => {
        const tile = document.createElement("button");
        tile.type = "button";
        tile.className = "board__tile";
        tile.dataset.categoryIndex = categoryIndex;
        tile.dataset.questionIndex = questionIndex;
        tile.textContent = question.points;
        tile.disabled = true;
        column.appendChild(tile);
      });

      columnsWrapper.appendChild(column);
    });
  };

  const setBoardLocked = (locked) => {
    board.classList.toggle("board--locked", locked);
    const tiles = board.querySelectorAll(".board__tile");
    tiles.forEach((tile) => {
      tile.disabled = locked || tile.classList.contains("board__tile--asked");
    });

    const overlay = board.querySelector(".board__overlay");
    if (overlay) {
      overlay.classList.toggle("board__overlay--visible", locked);
    }
  };

  const openModal = (categoryIndex, questionIndex) => {
    const category = gameData.categories[categoryIndex];
    const question = category.questions[questionIndex];
    activeQuestion = { categoryIndex, questionIndex, category, question };

    modalCategory.textContent = category.name;
    modalPoints.textContent = `${question.points} Punkte`;
    modalTitle.textContent = `Frage für ${question.points} Punkte`;
    modalText.textContent = question.prompt;
    modalAnswerText.textContent = question.answer;
    modalAnswer.hidden = true;
    modal.removeAttribute("hidden");
    document.body.classList.add("modal-open");
  };

  const closeModal = () => {
    modal.setAttribute("hidden", "");
    document.body.classList.remove("modal-open");
    activeQuestion = null;
    modalAnswer.hidden = true;
  };

  const markQuestionAsked = () => {
    if (!activeQuestion) return;
    const selector = `.board__tile[data-category-index="${activeQuestion.categoryIndex}"][data-question-index="${activeQuestion.questionIndex}"]`;
    const tile = board.querySelector(selector);
    if (tile) {
      tile.classList.add("board__tile--asked");
      tile.disabled = true;
    }

    closeModal();
  };

  renderBoard();
  setBoardLocked(true);
  generateSessionCode();

  startButton?.addEventListener("click", () => {
    setBoardLocked(false);
    startButton.disabled = true;
    startButton.textContent = "Game Running";
  });

  refreshButton?.addEventListener("click", () => {
    generateSessionCode();
  });

  board.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLButtonElement)) return;
    if (!target.classList.contains("board__tile")) return;
    if (target.disabled) return;

    const categoryIndex = Number(target.dataset.categoryIndex);
    const questionIndex = Number(target.dataset.questionIndex);
    openModal(categoryIndex, questionIndex);
  });

  revealAnswerButton?.addEventListener("click", () => {
    if (!activeQuestion) return;
    modalAnswer.hidden = false;
  });

  markCompleteButton?.addEventListener("click", () => {
    markQuestionAsked();
  });

  closeButtons?.forEach((button) =>
    button.addEventListener("click", () => {
      closeModal();
    })
  );

  modalBackdrop?.addEventListener("click", () => {
    closeModal();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !modal.hasAttribute("hidden")) {
      closeModal();
    }
  });
});
