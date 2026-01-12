// Game Configuration
const CONFIG = {
  GRID_SIZE: 8,
  TIMER_UPDATE_INTERVAL: 100,
  WIN_DELAY: 200,
  LOSE_DELAY: 200,
  GAME_TYPES: {
    normal: { min: 1, max: 64, count: 64, label: "Normal" },
    expand: { min: 1, max: 99, count: 64, label: "Expand" },
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

    this.init();
  }

  init() {
    this.attachSetupListeners();
  }

  attachSetupListeners() {
    // Radio button selection highlighting
    document.querySelectorAll(".radio-option").forEach((option) => {
      option.addEventListener("click", (e) => {
        const input = option.querySelector('input[type="radio"]');
        input.checked = true;

        // Update selected styling for this group
        const groupName = input.name;
        document
          .querySelectorAll(`input[name="${groupName}"]`)
          .forEach((radio) => {
            radio.closest(".radio-option").classList.remove("selected");
          });
        option.classList.add("selected");
      });
    });

    // Show/hide countdown selector based on timer mode
    document.querySelectorAll('input[name="timerMode"]').forEach((radio) => {
      radio.addEventListener("change", (e) => {
        const countdownSelector = document.getElementById("countdown-selector");
        if (e.target.value === "countdown") {
          countdownSelector.style.display = "block";
        } else {
          countdownSelector.style.display = "none";
        }
      });
    });

    // Update countdown time display
    const rangeInput = document.getElementById("countdown-minutes");
    const selectedTimeDisplay = document.getElementById("selected-time");

    rangeInput.addEventListener("input", (e) => {
      const minutes = e.target.value;
      selectedTimeDisplay.textContent = `${minutes} min`;
    });
  }

  startGame() {
    // Get selected options
    this.gameType = document.querySelector(
      'input[name="gameType"]:checked'
    ).value;
    this.sortOrder = document.querySelector(
      'input[name="sortOrder"]:checked'
    ).value;
    this.clickFeedback = document.querySelector(
      'input[name="clickFeedback"]:checked'
    ).value;
    this.timerMode = document.querySelector(
      'input[name="timerMode"]:checked'
    ).value;
    this.countdownMinutes = parseInt(
      document.getElementById("countdown-minutes").value
    );

    // Update display
    const config = CONFIG.GAME_TYPES[this.gameType];
    document.getElementById("mode-display").textContent = config.label;
    document.getElementById("sort-display").textContent =
      this.sortOrder === "ascending" ? "Ascending" : "Descending";
    document.getElementById("click-display").textContent =
      this.clickFeedback === "enabled" ? "Enabled" : "Disabled";

    // Update clock icon based on timer mode
    const clockContainer = document.getElementById("clock-container");
    const clockIcon = clockContainer.querySelector(".icon");
    if (this.timerMode === "countdown") {
      clockIcon.textContent = "⏳";
      clockContainer.classList.add("countdown-mode");
    } else {
      clockIcon.textContent = "⏱️";
      clockContainer.classList.remove("countdown-mode");
    }

    // Hide setup, show game
    document.getElementById("setup-screen").style.display = "none";
    document.getElementById("game-screen").style.display = "block";

    // Initialize game
    this.resetGame();
  }

  backToSetup() {
    // Stop timer if running
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }

    // Show setup, hide game
    document.getElementById("setup-screen").style.display = "block";
    document.getElementById("game-screen").style.display = "none";

    // Reset game state
    this.gameOver = false;
    this.currentIndex = 0;
    this.startTime = null;
    this.clickedButtons = [];
  }

  generateNumbers(gameType) {
    const config = CONFIG.GAME_TYPES[gameType];
    let numbers = [];

    if (gameType === "expand") {
      // Expand: Random 64 numbers from 1-99
      const range = Array.from(
        { length: config.max - config.min + 1 },
        (_, i) => i + config.min
      );

      const selected = [];
      for (let i = 0; i < config.count; i++) {
        const randomIndex = Math.floor(Math.random() * range.length);
        selected.push(range[randomIndex]);
        range.splice(randomIndex, 1);
      }
      numbers = selected;
    } else if (gameType === "insane") {
      // Insane: Random 64 numbers from 100-999
      const range = Array.from(
        { length: config.max - config.min + 1 },
        (_, i) => i + config.min
      );

      const selected = [];
      for (let i = 0; i < config.count; i++) {
        const randomIndex = Math.floor(Math.random() * range.length);
        selected.push(range[randomIndex]);
        range.splice(randomIndex, 1);
      }
      numbers = selected;
    } else {
      // Normal: Sequential 1-64
      numbers = Array.from({ length: config.count }, (_, i) => i + config.min);
    }

    // Sort based on user selection
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
      return String(num); // 100-999 already 3 digits
    } else {
      return String(num).padStart(2, "0"); // 01-99 format
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

    // Attach event listeners
    container.addEventListener("click", (e) => {
      if (e.target.classList.contains("square-btn") && !this.gameOver) {
        const number = parseInt(e.target.dataset.number);
        this.checkNumber(e.target, number);
      }
    });
  }

  checkNumber(button, number) {
    if (!button || typeof number !== "number") {
      console.error("Invalid button or number");
      return;
    }

    if (this.gameOver || button.disabled) return;

    // Start timer on first click
    if (this.currentIndex === 0 && !this.startTime) {
      this.startTimer();
    }

    const expectedNumber = this.sortedNumbers[this.currentIndex];

    if (number === expectedNumber) {
      // Correct click
      button.disabled = true;

      // Store clicked button for later coloring if click feedback is disabled
      this.clickedButtons.push({ button, correct: true });

      // Apply color immediately if click feedback is enabled
      if (this.clickFeedback === "enabled") {
        button.classList.add("clicked");
      }

      this.currentIndex++;
      this.updateMatch();

      if (this.currentIndex >= this.sortedNumbers.length) {
        // Win condition
        this.gameOver = true;
        const finalTime = this.stopTimer();

        // Show all colors if click feedback was disabled
        if (this.clickFeedback === "disabled") {
          this.revealAllClicks();
        }

        this.handleWin(finalTime);
      }
    } else {
      // Wrong click
      this.gameOver = true;

      // Store this button as incorrect
      this.clickedButtons.push({ button, correct: false });

      // Apply color immediately if click feedback is enabled
      if (this.clickFeedback === "enabled") {
        button.classList.add("misclicked");
      } else {
        // Reveal all clicks including this wrong one
        this.revealAllClicks();
        button.classList.add("misclicked");
      }

      this.disableAllButtons();
      this.stopTimer();
      this.handleLoss();
    }
  }

  revealAllClicks() {
    // Show all previously clicked buttons
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
      // Countdown mode
      this.countdownTimeLeft = this.countdownMinutes * 60 * 1000; // Convert to milliseconds

      this.timerInterval = setInterval(() => {
        const elapsed = Date.now() - this.startTime;
        const remaining = this.countdownTimeLeft - elapsed;

        if (remaining <= 0) {
          // Time's up!
          this.handleTimeUp();
          return;
        }

        const seconds = Math.floor(remaining / 1000);
        const minutes = Math.floor(seconds / 60);
        const displaySeconds = seconds % 60;

        document.getElementById("watch").textContent = `${String(
          minutes
        ).padStart(2, "0")}:${String(displaySeconds).padStart(2, "0")}`;

        // Add warning animation when less than 30 seconds
        const clockContainer = document.getElementById("clock-container");
        if (remaining <= 30000) {
          clockContainer.classList.add("countdown-warning");
        }
      }, CONFIG.TIMER_UPDATE_INTERVAL);
    } else {
      // Normal mode (count up)
      this.timerInterval = setInterval(() => {
        const elapsed = Date.now() - this.startTime;
        const seconds = Math.floor(elapsed / 1000);
        const minutes = Math.floor(seconds / 60);
        const displaySeconds = seconds % 60;

        document.getElementById("watch").textContent = `${String(
          minutes
        ).padStart(2, "0")}:${String(displaySeconds).padStart(2, "0")}`;
      }, CONFIG.TIMER_UPDATE_INTERVAL);
    }
  }

  handleTimeUp() {
    this.gameOver = true;
    this.stopTimer();

    // Reveal all clicks if click feedback was disabled
    if (this.clickFeedback === "disabled") {
      this.revealAllClicks();
    }

    this.disableAllButtons();

    setTimeout(() => {
      this.showModal("timeout");
    }, CONFIG.LOSE_DELAY);
  }

  stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    return this.startTime ? Date.now() - this.startTime : 0;
  }

  updateMatch() {
    const total = this.sortedNumbers.length;
    document.getElementById("match").textContent = `${String(
      this.currentIndex
    ).padStart(2, "0")}/${String(total).padStart(2, "0")}`;
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
    const timeString = `${String(minutes).padStart(2, "0")}:${String(
      displaySeconds
    ).padStart(2, "0")}`;

    document.getElementById("score").textContent = timeString;

    // Update best score (only for normal timer mode, not countdown)
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

  handleLoss() {
    setTimeout(() => {
      this.showModal("lose");
    }, CONFIG.LOSE_DELAY);
  }

  showModal(type, timeString = "", isBestScore = false) {
    const modal = document.createElement("div");
    modal.id = "game-modal";

    const config = CONFIG.GAME_TYPES[this.gameType];
    const sortLabel =
      this.sortOrder === "ascending" ? "Ascending" : "Descending";

    if (type === "win") {
      const key = `${this.gameType}_${this.sortOrder}_${this.clickFeedback}_${this.timerMode}`;
      const bestTime = this.bestScores[key];
      const bestMinutes = Math.floor(bestTime / 60000);
      const bestSeconds = Math.floor((bestTime % 60000) / 1000);
      const bestString = `${String(bestMinutes).padStart(2, "0")}:${String(
        bestSeconds
      ).padStart(2, "0")}`;

      modal.innerHTML = `
            <div class="modal-content">
              <h2>🎉 Congratulations!</h2>
              <p>You completed the challenge!</p>
              <div class="modal-stats">
                <div>🎮 Mode: <strong>${config.label}</strong></div>
                <div>📊 Sort: <strong>${sortLabel}</strong></div>
                <div>⏱️ Time: <strong>${timeString}</strong></div>
                <div>🏆 Best: <strong>${bestString}</strong></div>
                ${
                  isBestScore
                    ? '<div style="color: #ffd700;">⭐ NEW RECORD! ⭐</div>'
                    : ""
                }
              </div>
              <button class="modal-btn" onclick="game.closeModal(); game.backToSetup();">
                New Game
              </button>
            </div>
          `;
    } else if (type === "timeout") {
      modal.innerHTML = `
            <div class="modal-content">
              <h2>⏳ Time's Up!</h2>
              <p>You ran out of time!</p>
              <div class="modal-stats">
                <div>Progress: <strong>${this.currentIndex}/${
        this.sortedNumbers.length
      }</strong></div>
                <div>Time Limit: <strong>${this.countdownMinutes} minute${
        this.countdownMinutes > 1 ? "s" : ""
      }</strong></div>
              </div>
              <button class="modal-btn" onclick="game.closeModal(); game.backToSetup();">
                New Game
              </button>
            </div>
          `;
    } else {
      const expectedNum = this.formatNumber(
        this.sortedNumbers[this.currentIndex]
      );

      modal.innerHTML = `
            <div class="modal-content">
              <h2>❌ Game Over</h2>
              <p>You clicked the wrong number!</p>
              <div class="modal-stats">
                <div>Progress: <strong>${this.currentIndex}/${this.sortedNumbers.length}</strong></div>
                <div>Expected: <strong>${expectedNum}</strong></div>
              </div>
              <button class="modal-btn" onclick="game.closeModal(); game.backToSetup();">
                New Game
              </button>
            </div>
          `;
    }

    document.body.appendChild(modal);
  }

  closeModal() {
    const modal = document.getElementById("game-modal");
    if (modal) {
      modal.remove();
    }
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

    // Remove countdown warning styling
    const clockContainer = document.getElementById("clock-container");
    clockContainer.classList.remove("countdown-warning");

    // Reset displays
    const config = CONFIG.GAME_TYPES[this.gameType];

    if (this.timerMode === "countdown") {
      // Show initial countdown time
      const totalSeconds = this.countdownMinutes * 60;
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      document.getElementById("watch").textContent = `${String(
        minutes
      ).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    } else {
      document.getElementById("watch").textContent = "00:00";
    }

    document.getElementById("match").textContent =
      "00/" + String(config.count).padStart(2, "0");
    document.getElementById("score").textContent = "--:--";

    // Generate new numbers
    this.sortedNumbers = this.generateNumbers(this.gameType);
    this.shuffledNumbers = this.shuffleArray(this.sortedNumbers);

    // Update match display
    this.updateMatch();

    // Create new board
    this.createBoard();
  }

  loadBestScores() {
    const saved = localStorage.getItem("numclick-best-scores-v2");
    return saved ? JSON.parse(saved) : {};
  }

  saveBestScores() {
    localStorage.setItem(
      "numclick-best-scores-v2",
      JSON.stringify(this.bestScores)
    );
  }
}

// Initialize game
const game = new NumClickGame();
