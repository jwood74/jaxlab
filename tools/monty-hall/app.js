/**
 * Monty Hall Problem Simulator
 * Interactive game to explore the famous probability puzzle
 */

// Constants
const DOOR_REVEAL_DELAY_MS = 300; // Delay between sequential door reveals

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

// Sound effects
const sounds = {
    win: null,
    lose: null
};

/**
 * Create sound effects using Web Audio API
 */
function createSoundEffects() {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return; // Browser doesn't support Web Audio API
    
    let audioContext = null;
    
    // Create ka-ching sound (win)
    sounds.win = function() {
        if (!audioContext) audioContext = new AudioContext();
        
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(1200, audioContext.currentTime + 0.1);
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.3);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.3);
        
        // Second ching
        const SECOND_CHING_DELAY = 100;
        setTimeout(() => {
            const osc2 = audioContext.createOscillator();
            const gain2 = audioContext.createGain();
            
            osc2.connect(gain2);
            gain2.connect(audioContext.destination);
            
            osc2.frequency.setValueAtTime(900, audioContext.currentTime);
            osc2.frequency.exponentialRampToValueAtTime(1400, audioContext.currentTime + 0.1);
            
            gain2.gain.setValueAtTime(0.3, audioContext.currentTime);
            gain2.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.3);
            
            osc2.start(audioContext.currentTime);
            osc2.stop(audioContext.currentTime + 0.3);
        }, SECOND_CHING_DELAY);
    };
    
    // Create goat bleat sound (lose)
    sounds.lose = function() {
        if (!audioContext) audioContext = new AudioContext();
        
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(200, audioContext.currentTime);
        oscillator.frequency.linearRampToValueAtTime(150, audioContext.currentTime + 0.2);
        oscillator.frequency.linearRampToValueAtTime(180, audioContext.currentTime + 0.4);
        
        gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.4);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.4);
    };
}

/**
 * Initialize the application
 */
document.addEventListener('DOMContentLoaded', function() {
    // Get DOM elements
    doorsContainer = document.getElementById('doors-container');
    statusMessage = document.getElementById('status-message');
    actionButtons = document.getElementById('action-buttons');
    doorCountInput = document.getElementById('door-count');
    
    // Create sound effects
    createSoundEffects();
    
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
    
    // Reveal door(s) - with animation if more than 3 doors
    if (gameState.numDoors > 3) {
        revealDoorsSequentially();
    } else {
        revealDoor();
        statusMessage.textContent = 'A door has been opened! Do you want to stay or switch?';
        actionButtons.style.display = 'flex';
        renderDoors();
    }
}

/**
 * Reveal doors sequentially with animation (for more than 3 doors)
 */
async function revealDoorsSequentially() {
    const availableDoors = [];
    for (let i = 0; i < gameState.numDoors; i++) {
        if (i !== gameState.carDoor && i !== gameState.selectedDoor) {
            availableDoors.push(i);
        }
    }
    
    const doorsToReveal = Math.min(gameState.numDoors - 2, availableDoors.length);
    
    // Reveal doors one by one with animation
    for (let i = 0; i < doorsToReveal; i++) {
        if (availableDoors.length === 0) break;
        const randomIndex = Math.floor(Math.random() * availableDoors.length);
        const doorToReveal = availableDoors.splice(randomIndex, 1)[0];
        gameState.revealedDoors.push(doorToReveal);
        
        // Render doors to show the reveal
        renderDoors();
        
        // Wait before revealing next door
        await new Promise(resolve => setTimeout(resolve, DOOR_REVEAL_DELAY_MS));
    }
    
    // Show action buttons after all doors are revealed
    statusMessage.textContent = 'Doors have been opened! Do you want to stay or switch?';
    actionButtons.style.display = 'flex';
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
        // Play win sound
        if (sounds.win) sounds.win();
    } else {
        statusMessage.textContent = `😔 You lost! You ${decision === 'stay' ? 'stayed' : 'switched'} and got a goat.`;
        // Play lose sound
        if (sounds.lose) sounds.lose();
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
