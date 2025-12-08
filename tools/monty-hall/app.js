/**
 * Monty Hall Problem Simulator
 * Interactive game to explore the famous probability puzzle
 */

// Game state
let gameState = {
    numDoors: 3,
    carDoor: null,
    selectedDoor: null,
    revealedDoors: [],
    phase: 'SELECT', // SELECT, SWITCH_OR_STAY, REVEAL
    stayWins: 0,
    switchWins: 0,
    totalGames: 0,
    showProbabilities: false
};

// DOM elements
let doorsContainer;
let statusMessage;
let actionButtons;
let doorCountInput;

/**
 * Initialize the application
 */
document.addEventListener('DOMContentLoaded', function() {
    // Get DOM elements
    doorsContainer = document.getElementById('doors-container');
    statusMessage = document.getElementById('status-message');
    actionButtons = document.getElementById('action-buttons');
    doorCountInput = document.getElementById('door-count');
    
    // Event listeners
    document.getElementById('reset-doors').addEventListener('click', resetGame);
    document.getElementById('show-probabilities').addEventListener('change', toggleProbabilities);
    document.getElementById('stay-button').addEventListener('click', () => makeDecision('stay'));
    document.getElementById('switch-button').addEventListener('click', () => makeDecision('switch'));
    doorCountInput.addEventListener('change', function() {
        const newCount = parseInt(this.value);
        if (newCount >= 3 && newCount <= 10) {
            gameState.numDoors = newCount;
            resetGame();
        }
    });
    
    // Load saved statistics
    loadStatistics();
    
    // Initialize game
    resetGame();
});

/**
 * Reset the game to initial state
 */
function resetGame() {
    // Reset game state
    gameState.carDoor = Math.floor(Math.random() * gameState.numDoors);
    gameState.selectedDoor = null;
    gameState.revealedDoors = [];
    gameState.phase = 'SELECT';
    
    // Hide action buttons
    actionButtons.style.display = 'none';
    
    // Update status
    statusMessage.textContent = 'Pick a door to start!';
    
    // Render doors
    renderDoors();
}

/**
 * Render the doors
 */
function renderDoors() {
    doorsContainer.innerHTML = '';
    
    for (let i = 0; i < gameState.numDoors; i++) {
        const door = document.createElement('div');
        door.className = 'door';
        door.dataset.doorIndex = i;
        
        // Add selected class if this is the selected door
        if (i === gameState.selectedDoor) {
            door.classList.add('selected');
        }
        
        // Add revealed class if this door is revealed
        if (gameState.revealedDoors.includes(i)) {
            door.classList.add('revealed');
        }
        
        // Add opened class if in reveal phase
        if (gameState.phase === 'REVEAL') {
            door.classList.add('opened');
        }
        
        // Door number
        const doorNumber = document.createElement('div');
        doorNumber.className = 'door-number';
        doorNumber.textContent = i + 1;
        door.appendChild(doorNumber);
        
        // Door content (shown when opened/revealed)
        const doorContent = document.createElement('div');
        doorContent.className = 'door-content';
        if (i === gameState.carDoor) {
            doorContent.textContent = '🚗';
            doorContent.classList.add('car');
        } else {
            doorContent.textContent = '🐐';
            doorContent.classList.add('goat');
        }
        door.appendChild(doorContent);
        
        // Probability display
        if (gameState.showProbabilities) {
            const probability = calculateProbability(i);
            const probDisplay = document.createElement('div');
            probDisplay.className = 'probability';
            probDisplay.textContent = `${(probability * 100).toFixed(1)}%`;
            door.appendChild(probDisplay);
        }
        
        // Click handler
        if (gameState.phase === 'SELECT' && !gameState.revealedDoors.includes(i)) {
            door.addEventListener('click', () => selectDoor(i));
            door.classList.add('clickable');
        }
        
        doorsContainer.appendChild(door);
    }
}

/**
 * Calculate probability for a specific door
 */
function calculateProbability(doorIndex) {
    if (gameState.phase === 'SELECT') {
        // Initially all doors have equal probability
        return 1 / gameState.numDoors;
    } else if (gameState.phase === 'SWITCH_OR_STAY') {
        // After reveal, calculate conditional probabilities
        const unopenedDoors = [];
        for (let i = 0; i < gameState.numDoors; i++) {
            if (!gameState.revealedDoors.includes(i)) {
                unopenedDoors.push(i);
            }
        }
        
        if (doorIndex === gameState.selectedDoor) {
            // Probability of original choice remains 1/n
            return 1 / gameState.numDoors;
        } else if (gameState.revealedDoors.includes(doorIndex)) {
            // Revealed doors have 0 probability
            return 0;
        } else {
            // Other unopened doors share the remaining probability
            const remainingProb = 1 - (1 / gameState.numDoors);
            const otherUnopened = unopenedDoors.filter(d => d !== gameState.selectedDoor).length;
            return remainingProb / otherUnopened;
        }
    } else {
        // In reveal phase, show actual result
        return doorIndex === gameState.carDoor ? 1 : 0;
    }
}

/**
 * Handle door selection
 */
function selectDoor(doorIndex) {
    if (gameState.phase !== 'SELECT') return;
    
    gameState.selectedDoor = doorIndex;
    gameState.phase = 'SWITCH_OR_STAY';
    
    // Reveal one door (that is not the car and not selected)
    revealDoor();
    
    // Update UI
    statusMessage.textContent = 'A door has been opened! Do you want to stay or switch?';
    actionButtons.style.display = 'flex';
    renderDoors();
}

/**
 * Reveal a door (not the car, not the selected door)
 */
function revealDoor() {
    const availableDoors = [];
    for (let i = 0; i < gameState.numDoors; i++) {
        if (i !== gameState.carDoor && i !== gameState.selectedDoor) {
            availableDoors.push(i);
        }
    }
    
    // Reveal all but one of the available doors (for 3 doors, reveal 1; for more doors, reveal n-2)
    // This ensures there's always one other unopened door to switch to
    const doorsToReveal = Math.min(gameState.numDoors - 2, availableDoors.length);
    for (let i = 0; i < doorsToReveal; i++) {
        if (availableDoors.length === 0) break; // Safety check
        const randomIndex = Math.floor(Math.random() * availableDoors.length);
        const doorToReveal = availableDoors.splice(randomIndex, 1)[0];
        gameState.revealedDoors.push(doorToReveal);
    }
}

/**
 * Handle stay or switch decision
 */
function makeDecision(decision) {
    if (gameState.phase !== 'SWITCH_OR_STAY') return;
    
    let finalDoor = gameState.selectedDoor;
    
    if (decision === 'switch') {
        // Find the other unopened door
        for (let i = 0; i < gameState.numDoors; i++) {
            if (i !== gameState.selectedDoor && !gameState.revealedDoors.includes(i)) {
                finalDoor = i;
                break;
            }
        }
    }
    
    // Check if won
    const won = finalDoor === gameState.carDoor;
    
    // Update statistics
    gameState.totalGames++;
    if (decision === 'stay') {
        if (won) gameState.stayWins++;
    } else {
        if (won) gameState.switchWins++;
    }
    
    // Save statistics
    saveStatistics();
    updateStatistics();
    
    // Update game state
    gameState.selectedDoor = finalDoor;
    gameState.phase = 'REVEAL';
    
    // Update UI
    actionButtons.style.display = 'none';
    if (won) {
        statusMessage.textContent = `🎉 You won! You ${decision === 'stay' ? 'stayed' : 'switched'} and found the car!`;
    } else {
        statusMessage.textContent = `😔 You lost! You ${decision === 'stay' ? 'stayed' : 'switched'} and got a goat.`;
    }
    
    renderDoors();
    
    // Auto reset after a delay
    setTimeout(() => {
        resetGame();
    }, 3000);
}

/**
 * Toggle probability display
 */
function toggleProbabilities(event) {
    gameState.showProbabilities = event.target.checked;
    renderDoors();
}

/**
 * Update statistics display
 */
function updateStatistics() {
    document.getElementById('stay-wins').textContent = gameState.stayWins;
    document.getElementById('switch-wins').textContent = gameState.switchWins;
    document.getElementById('total-games').textContent = gameState.totalGames;
    
    if (gameState.totalGames > 0) {
        const stayPercentage = (gameState.stayWins / gameState.totalGames * 100).toFixed(1);
        const switchPercentage = (gameState.switchWins / gameState.totalGames * 100).toFixed(1);
        document.getElementById('stay-percentage').textContent = `${stayPercentage}%`;
        document.getElementById('switch-percentage').textContent = `${switchPercentage}%`;
    }
}

/**
 * Save statistics to localStorage
 */
function saveStatistics() {
    localStorage.setItem('montyHall_stayWins', gameState.stayWins);
    localStorage.setItem('montyHall_switchWins', gameState.switchWins);
    localStorage.setItem('montyHall_totalGames', gameState.totalGames);
}

/**
 * Load statistics from localStorage
 */
function loadStatistics() {
    gameState.stayWins = parseInt(localStorage.getItem('montyHall_stayWins') || '0');
    gameState.switchWins = parseInt(localStorage.getItem('montyHall_switchWins') || '0');
    gameState.totalGames = parseInt(localStorage.getItem('montyHall_totalGames') || '0');
    updateStatistics();
}
