document.addEventListener("DOMContentLoaded", () => {
  const joinForm = document.querySelector("[data-join-form]");
  const joinStatus = document.querySelector("[data-join-status]");
  const controlsCard = document.querySelector("[data-controls]");
  const buzzerButton = document.querySelector("[data-buzzer]");
  const answerButtons = Array.from(document.querySelectorAll("[data-answer]"));
  const resetButton = document.querySelector("[data-reset]");
  const feedbackField = document.querySelector("[data-feedback]");

  let isConnected = false;
  let hasBuzzed = false;
  let selectedAnswer = null;

  const setControlsEnabled = (enabled) => {
    controlsCard.classList.toggle("controls-card--disabled", !enabled);
    buzzerButton.disabled = !enabled;
    resetButton.disabled = !enabled;
    answerButtons.forEach((button) => {
      button.disabled = !enabled;
    });
  };

  const updateFeedback = (message) => {
    feedbackField.textContent = message;
  };

  const resetSelection = () => {
    hasBuzzed = false;
    selectedAnswer = null;
    buzzerButton.classList.remove("buzzer--active");
    answerButtons.forEach((button) => {
      button.classList.remove("answer-button--selected");
    });
    updateFeedback(isConnected ? "Ready to buzz in!" : "Connect to activate the controls.");
  };

  joinForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(joinForm);
    const name = (formData.get("player-name") || "").toString().trim();
    const code = (formData.get("player-code") || "").toString().trim();

    if (!name || !/^\d{4}$/.test(code)) {
      updateFeedback("Please enter a display name and 4-digit code.");
      return;
    }

    isConnected = true;
    joinStatus.textContent = `Connected as ${name} (Code ${code})`;
    joinStatus.classList.add("join-card__status--connected");
    setControlsEnabled(true);
    resetSelection();
    joinForm.reset();
  });

  buzzerButton?.addEventListener("click", () => {
    if (!isConnected) return;
    hasBuzzed = true;
    buzzerButton.classList.add("buzzer--active");
    updateFeedback("You buzzed in! Lock your answer or wait for the host.");
  });

  answerButtons.forEach((button) => {
    button.addEventListener("click", () => {
      if (!isConnected) return;
      const value = button.dataset.answer;
      selectedAnswer = value;
      answerButtons.forEach((btn) => btn.classList.toggle("answer-button--selected", btn === button));
      if (!hasBuzzed) {
        updateFeedback(`Answer prepared: ${value}. Don't forget to buzz in!`);
      } else {
        updateFeedback(`Answer locked: ${value}. Await host confirmation.`);
      }
    });
  });

  resetButton?.addEventListener("click", () => {
    if (!isConnected) return;
    resetSelection();
  });

  // Initialize with controls disabled
  setControlsEnabled(false);
});
