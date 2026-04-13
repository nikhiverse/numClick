// Game Configuration
const CONFIG = {
  GRID_SIZE: 8,
  TIMER_UPDATE_INTERVAL: 100,
  WIN_DELAY: 1000,
  LOSE_DELAY: 1000,
  GAME_TYPES: {
    normal: { min: 1, max: 64, count: 64, label: "Normal" },
    expand: { min: 1, max: 128, count: 64, label: "Expand" },
    insane: { min: 100, max: 999, count: 64, label: "Insane" },
  },
};

// Game State
class NumClickGame {
  constructor() {
    this.gameType = "normal";
    this.sortOrder = "ascending";
    this.clickFeedback = "enabled";
    this.timerMode = "normal";
    this.countdownMinutes = 3;
    this.sortedNumbers = [];
    this.shuffledNumbers = [];
    this.currentIndex = 0;
    this.gameOver = false;
    this.startTime = null;
    this.timerInterval = null;
    this.countdownTimeLeft = 0;
    this.clickedButtons = [];
    this.bestScores = this.loadBestScores();
    this.currentTheme = "grey";

    this.init();
  }

  init() {
    this.attachSetupListeners();
    const savedTheme = localStorage.getItem("numclick-theme") || "grey";
    const themeElement = document.getElementById(`theme-${savedTheme}`);
    this.setTheme(savedTheme, themeElement);
  }

  toggleSettings() {
    const modal = document.getElementById("settings-modal");
    if (modal.style.display === "none" || modal.style.display === "") {
      modal.style.display = "flex";
    } else {
      modal.style.display = "none";
    }
  }

  setTheme(theme, element) {
    this.currentTheme = theme;

    const options = document.querySelectorAll("#settings-modal .radio-option");
    options.forEach((opt) => opt.classList.remove("selected"));

    if (element) {
      element.classList.add("selected");
      const input = element.querySelector("input");
      if (input) input.checked = true;
    }

    if (theme === "grey") {
      document.documentElement.removeAttribute("data-theme");
    } else {
      document.documentElement.setAttribute("data-theme", theme);
    }

    localStorage.setItem("numclick-theme", theme);
  }

  attachSetupListeners() {
    document.querySelectorAll(".radio-option").forEach((option) => {
      if (option.closest("#settings-modal")) return;

      option.addEventListener("click", (e) => {
        const input = option.querySelector('input[type="radio"]');
        input.checked = true;

        const groupName = input.name;
        document
          .querySelectorAll(`input[name="${groupName}"]`)
          .forEach((radio) => {
            radio.closest(".radio-option").classList.remove("selected");
          });
        option.classList.add("selected");

        const countdownSelector = document.getElementById("countdown-selector");
        if (groupName === "timerMode") {
          if (input.value === "countdown") {
            countdownSelector.style.display = "block";
          } else {
            countdownSelector.style.display = "none";
          }
        }
      });
    });

    const rangeInput = document.getElementById("countdown-minutes");
    const labels = document.querySelectorAll(".time-label");

    if (rangeInput) {
      rangeInput.addEventListener("input", (e) => {
        const selectedVal = parseInt(e.target.value);
        labels.forEach((label) => {
          if (parseInt(label.getAttribute("data-value")) === selectedVal) {
            label.style.color = "var(--accent)";
            label.style.fontWeight = "600";
          } else {
            label.style.color = "var(--btn-text)";
            label.style.fontWeight = "400";
          }
        });
      });
    }
  }

  startGame() {
    this.gameType = document.querySelector(
      'input[name="gameType"]:checked',
    ).value;
    this.sortOrder = document.querySelector(
      'input[name="sortOrder"]:checked',
    ).value;
    this.clickFeedback = document.querySelector(
      'input[name="clickFeedback"]:checked',
    ).value;
    this.timerMode = document.querySelector(
      'input[name="timerMode"]:checked',
    ).value;
    this.countdownMinutes = parseInt(
      document.getElementById("countdown-minutes").value,
    );

    const config = CONFIG.GAME_TYPES[this.gameType];
    document.getElementById("mode-display").textContent = config.label;
    document.getElementById("sort-display").textContent =
      this.sortOrder === "ascending" ? "Ascending" : "Descending";
    document.getElementById("click-display").textContent =
      this.clickFeedback === "enabled" ? "Enabled" : "Disabled";

    const clockIcon = document.querySelector("#clock-pill .icon");
    if (this.timerMode === "countdown") {
      clockIcon.textContent = "⏳";
    } else {
      clockIcon.textContent = "⏱️";
    }

    document.getElementById("setup-screen").style.display = "none";
    document.getElementById("game-screen").style.display = "block";

    this.resetGame();
  }

  backToSetup() {
    if (this.startTime && !this.gameOver) {
      this.showModal("confirmExit");
    } else {
      this.confirmBackToSetup();
    }
  }

  confirmBackToSetup() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    document.getElementById("setup-screen").style.display = "block";
    document.getElementById("game-screen").style.display = "none";
    this.gameOver = false;
    this.currentIndex = 0;
    this.startTime = null;
    this.clickedButtons = [];
  }

  generateNumbers(gameType) {
    const config = CONFIG.GAME_TYPES[gameType];
    let numbers = [];

    if (gameType === "expand" || gameType === "insane") {
      const range = Array.from(
        { length: config.max - config.min + 1 },
        (_, i) => i + config.min,
      );
      const selected = [];
      for (let i = 0; i < config.count; i++) {
        const randomIndex = Math.floor(Math.random() * range.length);
        selected.push(range[randomIndex]);
        range.splice(randomIndex, 1);
      }
      numbers = selected;
    } else {
      numbers = Array.from({ length: config.count }, (_, i) => i + config.min);
    }

    if (this.sortOrder === "ascending") {
      return numbers.sort((a, b) => a - b);
    } else {
      return numbers.sort((a, b) => b - a);
    }
  }

  shuffleArray(arr) {
    const shuffled = [...arr];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  formatNumber(num) {
    if (this.gameType === "insane") {
      return String(num);
    } else {
      return String(num).padStart(2, "0");
    }
  }

  createBoard() {
    const container = document.getElementById("square-container");
    container.innerHTML = "";

    for (let i = CONFIG.GRID_SIZE - 1; i >= 0; i--) {
      const row = document.createElement("div");
      row.className = "grid-row";

      for (let j = 0; j < CONFIG.GRID_SIZE; j++) {
        const index = i * CONFIG.GRID_SIZE + j;
        const number = this.shuffledNumbers[index];

        const button = document.createElement("button");
        button.className = "square-btn";
        button.dataset.number = number;
        button.textContent = this.formatNumber(number);

        row.appendChild(button);
      }
      container.appendChild(row);
    }

    container.addEventListener("click", (e) => {
      if (e.target.classList.contains("square-btn") && !this.gameOver) {
        const number = parseInt(e.target.dataset.number);
        this.checkNumber(e.target, number);
      }
    });
  }

  checkNumber(button, number) {
    if (!button || typeof number !== "number") return;
    if (this.gameOver || button.disabled) return;

    const expectedNumber = this.sortedNumbers[this.currentIndex];

    if (number === expectedNumber) {
      button.disabled = true;
      this.clickedButtons.push({ button, correct: true });

      if (this.clickFeedback === "enabled") {
        button.classList.add("clicked");
      }

      this.currentIndex++;

      if (this.currentIndex >= this.sortedNumbers.length) {
        this.gameOver = true;
        const finalTime = this.stopTimer();
        if (this.clickFeedback === "disabled") this.revealAllClicks();
        this.handleWin(finalTime);
      }
    } else {
      this.gameOver = true;
      this.clickedButtons.push({ button, correct: false });

      if (this.clickFeedback === "enabled") {
        button.classList.add("misclicked");
      } else {
        this.revealAllClicks();
        button.classList.add("misclicked");
      }

      this.disableAllButtons();
      this.stopTimer();
      this.handleLoss(number);
    }
  }

  revealAllClicks() {
    this.clickedButtons.forEach(({ button, correct }) => {
      if (correct) {
        button.classList.add("clicked");
      } else {
        button.classList.add("misclicked");
      }
    });
  }

  startTimer() {
    this.startTime = Date.now();

    if (this.timerMode === "countdown") {
      this.countdownTimeLeft = this.countdownMinutes * 60 * 1000;
      this.timerInterval = setInterval(() => {
        const elapsed = Date.now() - this.startTime;
        const remaining = this.countdownTimeLeft - elapsed;

        if (remaining <= 0) {
          this.handleTimeUp();
          return;
        }

        const seconds = Math.floor(remaining / 1000);
        const minutes = Math.floor(seconds / 60);
        const displaySeconds = seconds % 60;
        document.getElementById("watch").textContent =
          `${String(minutes).padStart(2, "0")}:${String(displaySeconds).padStart(2, "0")}`;
      }, CONFIG.TIMER_UPDATE_INTERVAL);
    } else {
      this.timerInterval = setInterval(() => {
        const elapsed = Date.now() - this.startTime;
        const seconds = Math.floor(elapsed / 1000);
        const minutes = Math.floor(seconds / 60);
        const displaySeconds = seconds % 60;
        document.getElementById("watch").textContent =
          `${String(minutes).padStart(2, "0")}:${String(displaySeconds).padStart(2, "0")}`;
      }, CONFIG.TIMER_UPDATE_INTERVAL);
    }
  }

  handleTimeUp() {
    this.gameOver = true;
    this.stopTimer();
    if (this.clickFeedback === "disabled") this.revealAllClicks();
    this.disableAllButtons();

    setTimeout(() => {
      this.showModal("timeout");
    }, CONFIG.LOSE_DELAY / 1000);
  }

  stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    return this.startTime ? Date.now() - this.startTime : 0;
  }

  disableAllButtons() {
    document.querySelectorAll(".square-btn").forEach((btn) => {
      btn.disabled = true;
    });
  }

  handleWin(finalTime) {
    const seconds = Math.floor(finalTime / 1000);
    const minutes = Math.floor(seconds / 60);
    const displaySeconds = seconds % 60;
    const timeString = `${String(minutes).padStart(2, "0")}:${String(displaySeconds).padStart(2, "0")}`;

    document.getElementById("score").textContent = timeString;

    let isBestScore = false;
    if (this.timerMode === "normal") {
      const key = `${this.gameType}_${this.sortOrder}_${this.clickFeedback}_${this.timerMode}`;
      isBestScore = !this.bestScores[key] || finalTime < this.bestScores[key];

      if (isBestScore) {
        this.bestScores[key] = finalTime;
        this.saveBestScores();
      }
    }

    setTimeout(() => {
      this.showModal("win", timeString, isBestScore);
    }, CONFIG.WIN_DELAY);
  }

  handleLoss(clickedNum) {
    setTimeout(() => {
      this.showModal("lose", "", false, clickedNum);
    }, CONFIG.LOSE_DELAY);
  }

  showModal(type, timeString = "", isBestScore = false, clickedNum = null) {
    const modal = document.createElement("div");
    modal.id = "game-modal";

    const config = CONFIG.GAME_TYPES[this.gameType];
    const sortLabel =
      this.sortOrder === "ascending" ? "Ascending" : "Descending";
    const currentProgress = this.currentIndex;
    const totalProgress = this.sortedNumbers.length;

    if (type === "win") {
      const key = `${this.gameType}_${this.sortOrder}_${this.clickFeedback}_${this.timerMode}`;
      const bestTime = this.bestScores[key];
      let bestString;

      if (bestTime) {
        const bestMinutes = Math.floor(bestTime / 60000);
        const bestSeconds = Math.floor((bestTime % 60000) / 1000);
        bestString = `${String(bestMinutes).padStart(2, "0")}:${String(bestSeconds).padStart(2, "0")}`;
      } else {
        bestString = timeString;
      }

      modal.innerHTML = `
        <div class="modal-content">
          <h2 style="color: var(--accent)">🎉 Congratulations!</h2>
          <div class="modal-stats">
            <div>Mode: <strong>${config.label}</strong></div>
            <div>Sort: <strong>${sortLabel}</strong></div>
            <div>Time: <strong>${timeString}</strong></div>
            <div>Best: <strong>${bestString}</strong></div>
            ${isBestScore ? '<div style="color: var(--warning); margin-top: 10px; font-weight: bold; text-align: center;">⭐ NEW RECORD! ⭐</div>' : ""}
          </div>
          <button class="modal-btn" onclick="game.closeModal(); game.backToSetup();">Main Menu</button>
        </div>
      `;
    } else if (type === "timeout") {
      modal.innerHTML = `
        <div class="modal-content">
          <h2 style="color: var(--error)">⏳ Time's Up!</h2>
          <div class="modal-stats">
            <div>Limit: <strong>${this.countdownMinutes} min</strong></div>
            <div>Progress: <strong style="color: var(--accent)">${currentProgress}/${totalProgress}</strong></div>
          </div>
          <button class="modal-btn" onclick="game.closeModal(); game.backToSetup();">Main Menu</button>
        </div>
      `;
    } else if (type == "confirmExit") {
      modal.innerHTML = `
        <div class="modal-content">
          <h2 style="color: var(--warning)">⚠️ Quit Game?</h2>
          <div style="display: flex; gap: 10px; margin-top: 20px;">
            <button class="modal-btn" style="background: var(--error);" onclick="game.closeModal(); game.confirmBackToSetup();">Yes</button>
            <button class="modal-btn" onclick="game.closeModal();">No</button>
          </div>
        </div>
      `;
    } else {
      const expectedNum = this.formatNumber(
        this.sortedNumbers[this.currentIndex],
      );
      modal.innerHTML = `
        <div class="modal-content">
          <h2 style="color: var(--error)">❌ Game Over</h2>
          <div class="modal-stats">
            <div>Progress: <strong style="color: var(--accent)">${currentProgress}/${totalProgress}</strong></div>
            <div>Expected: <strong style="color: var(--correct)">${expectedNum}</strong></div>
            <div>Clicked: <strong style="color: var(--error)">${this.formatNumber(clickedNum)}</strong></div>
          </div>
          <button class="modal-btn" onclick="game.closeModal(); game.backToSetup();">Main Menu</button>
        </div>
      `;
    }
    document.body.appendChild(modal);
  }

  closeModal() {
    const modal = document.getElementById("game-modal");
    if (modal) modal.remove();
  }

  resetGame() {
    this.closeModal();
    this.gameOver = false;
    this.currentIndex = 0;
    this.startTime = null;
    this.clickedButtons = [];

    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }

    if (this.timerMode === "countdown") {
      const totalSeconds = this.countdownMinutes * 60;
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      document.getElementById("watch").textContent =
        `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    } else {
      document.getElementById("watch").textContent = "00:00";
    }

    document.getElementById("score").textContent = "--:--";

    this.sortedNumbers = this.generateNumbers(this.gameType);
    this.shuffledNumbers = this.shuffleArray(this.sortedNumbers);
    this.createBoard();
    this.startTimer();
  }

  loadBestScores() {
    const saved = localStorage.getItem("numclick-best-scores-v2");
    return saved ? JSON.parse(saved) : {};
  }

  saveBestScores() {
    localStorage.setItem(
      "numclick-best-scores-v2",
      JSON.stringify(this.bestScores),
    );
  }
}

const game = new NumClickGame();

window.addEventListener("beforeunload", (event) => {
  if (game.startTime && !game.gameOver) {
    event.preventDefault();
    event.returnValue = "";
  }
});
