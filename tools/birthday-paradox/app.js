/**
 * Birthday Paradox Visualiser
 * Interactive tool to explore birthday collision probabilities
 */

// State management
const state = {
    people: [], // Array of person objects: {id, birthday, element}
    nextId: 1,
    collisionGroups: [] // Array of arrays, each containing person IDs with same birthday
};

// DOM elements
let roomElement;
let peopleCountElement;
let collisionStatusElement;
let theoreticalProbabilityElement;

/**
 * Initialize the application when DOM is ready
 */
document.addEventListener('DOMContentLoaded', () => {
    initializeDOMElements();
    setupEventListeners();
    updateDisplay();
});

/**
 * Cache DOM element references
 */
function initializeDOMElements() {
    roomElement = document.getElementById('room');
    peopleCountElement = document.getElementById('people-count');
    collisionStatusElement = document.getElementById('collision-status');
    theoreticalProbabilityElement = document.getElementById('theoretical-probability');
}

/**
 * Setup all event listeners for interactive elements
 */
function setupEventListeners() {
    document.getElementById('add-one').addEventListener('click', () => addPeople(1));
    document.getElementById('add-five').addEventListener('click', () => addPeople(5));
    document.getElementById('add-ten').addEventListener('click', () => addPeople(10));
    document.getElementById('add-twenty').addEventListener('click', () => addPeople(20));
    document.getElementById('reset').addEventListener('click', resetRoom);
    document.getElementById('run-simulation').addEventListener('click', runSimulation);
}

/**
 * Generate a random birthday (day of year from 1 to 365)
 * @returns {number} Random day number between 1 and 365
 */
function generateBirthday() {
    return Math.floor(Math.random() * 365) + 1;
}

/**
 * Convert day number to a readable date string
 * @param {number} dayOfYear - Day number (1-365)
 * @returns {string} Formatted date string (e.g., "Jan 15")
 */
function dayToDateString(dayOfYear) {
    // Month lengths for non-leap year
    const monthDays = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    let remaining = dayOfYear;
    let monthIndex = 0;
    
    while (remaining > monthDays[monthIndex]) {
        remaining -= monthDays[monthIndex];
        monthIndex++;
    }
    
    return `${monthNames[monthIndex]} ${remaining}`;
}

/**
 * Add a single person to the room
 * @returns {Object} The person object created
 */
function addPerson() {
    const birthday = generateBirthday();
    const person = {
        id: state.nextId++,
        birthday: birthday,
        element: null
    };
    
    // Create visual element
    const personElement = document.createElement('div');
    personElement.className = 'person';
    personElement.setAttribute('data-birthday', dayToDateString(birthday));
    personElement.textContent = '👤';
    personElement.title = `Birthday: ${dayToDateString(birthday)}`;
    
    person.element = personElement;
    state.people.push(person);
    roomElement.appendChild(personElement);
    
    return person;
}

/**
 * Add multiple people to the room with a staggered animation
 * @param {number} count - Number of people to add
 */
async function addPeople(count) {
    const delayMs = count > 10 ? 50 : 100; // Faster animation for large groups
    
    for (let i = 0; i < count; i++) {
        addPerson();
        
        // Detect collisions after each addition
        detectCollisions();
        updateDisplay();
        
        // Small delay for visual effect
        if (i < count - 1) {
            await sleep(delayMs);
        }
    }
}

/**
 * Detect birthday collisions and update collision groups
 */
function detectCollisions() {
    // Clear previous collision groups
    state.collisionGroups = [];
    
    // Group people by birthday
    const birthdayMap = new Map();
    
    state.people.forEach(person => {
        if (!birthdayMap.has(person.birthday)) {
            birthdayMap.set(person.birthday, []);
        }
        birthdayMap.get(person.birthday).push(person);
    });
    
    // Find groups with 2 or more people (collisions)
    birthdayMap.forEach((group, birthday) => {
        if (group.length >= 2) {
            state.collisionGroups.push(group);
        }
    });
    
    // Update visual highlighting
    updateCollisionHighlighting();
}

/**
 * Update visual highlighting for people with matching birthdays
 */
function updateCollisionHighlighting() {
    // Remove collision class from all people
    state.people.forEach(person => {
        person.element.classList.remove('collision');
    });
    
    // Add collision class to people in collision groups
    state.collisionGroups.forEach(group => {
        group.forEach(person => {
            person.element.classList.add('collision');
        });
    });
}

/**
 * Calculate the theoretical probability of at least one birthday collision
 * @param {number} n - Number of people
 * @returns {number} Probability as a decimal (0 to 1)
 */
function calculateProbability(n) {
    if (n <= 1) return 0;
    if (n > 365) return 1;
    
    // Calculate probability of no collisions, then subtract from 1
    // P(no collision) = (365/365) * (364/365) * (363/365) * ... * ((365-n+1)/365)
    let probabilityNoCollision = 1;
    
    for (let i = 0; i < n; i++) {
        probabilityNoCollision *= (365 - i) / 365;
    }
    
    return 1 - probabilityNoCollision;
}

/**
 * Update all display elements with current state
 */
function updateDisplay() {
    const peopleCount = state.people.length;
    const hasCollision = state.collisionGroups.length > 0;
    const probability = calculateProbability(peopleCount);
    
    // Update statistics
    peopleCountElement.textContent = peopleCount;
    collisionStatusElement.textContent = hasCollision ? 'Yes! ✓' : 'None';
    collisionStatusElement.style.color = hasCollision ? '#10b981' : 'var(--text-primary)';
    
    theoreticalProbabilityElement.textContent = `${(probability * 100).toFixed(1)}%`;
}

/**
 * Reset the room and clear all people
 */
function resetRoom() {
    state.people = [];
    state.collisionGroups = [];
    state.nextId = 1;
    roomElement.innerHTML = '';
    updateDisplay();
}

/**
 * Run a simulation with multiple trials
 */
async function runSimulation() {
    const simPeopleInput = document.getElementById('sim-people');
    const simTrialsInput = document.getElementById('sim-trials');
    const simResultsElement = document.getElementById('simulation-results');
    const simCollisionsElement = document.getElementById('sim-collisions');
    const simObservedElement = document.getElementById('sim-observed');
    const simTheoreticalElement = document.getElementById('sim-theoretical');
    const progressBarElement = document.getElementById('progress-bar');
    const convergenceInfoElement = document.getElementById('convergence-info');
    
    const groupSize = parseInt(simPeopleInput.value);
    const totalTrials = parseInt(simTrialsInput.value);
    
    // Validate inputs
    if (groupSize < 2 || groupSize > 100) {
        alert('Group size must be between 2 and 100');
        return;
    }
    
    // Show results section
    simResultsElement.style.display = 'block';
    
    // Reset progress and results for new simulation
    progressBarElement.style.width = '0%';
    progressBarElement.textContent = '';
    simCollisionsElement.textContent = '0';
    simObservedElement.textContent = '0%';
    simTheoreticalElement.textContent = `${(calculateProbability(groupSize) * 100).toFixed(2)}%`;
    convergenceInfoElement.textContent = '';
    
    // Small delay to ensure reset is visible
    await sleep(50);
    
    let collisionCount = 0;
    const batchSize = 100; // Process in batches for UI updates
    const batches = Math.ceil(totalTrials / batchSize);
    
    // Run simulation in batches
    for (let batch = 0; batch < batches; batch++) {
        const trialsInBatch = Math.min(batchSize, totalTrials - (batch * batchSize));
        
        // Run trials in this batch
        for (let trial = 0; trial < trialsInBatch; trial++) {
            if (simulateTrial(groupSize)) {
                collisionCount++;
            }
        }
        
        // Update progress
        const completedTrials = (batch + 1) * batchSize;
        const progress = Math.min((completedTrials / totalTrials) * 100, 100);
        progressBarElement.style.width = `${progress}%`;
        progressBarElement.textContent = `${Math.round(progress)}%`;
        
        // Update results
        const observedProbability = (collisionCount / Math.min(completedTrials, totalTrials)) * 100;
        const theoreticalProbability = calculateProbability(groupSize) * 100;
        
        simCollisionsElement.textContent = `${collisionCount} / ${Math.min(completedTrials, totalTrials)}`;
        simObservedElement.textContent = `${observedProbability.toFixed(2)}%`;
        simTheoreticalElement.textContent = `${theoreticalProbability.toFixed(2)}%`;
        
        // Update convergence info
        const difference = Math.abs(observedProbability - theoreticalProbability);
        convergenceInfoElement.textContent = `Difference from theoretical: ${difference.toFixed(2)}% - The observed probability ${difference < 2 ? 'closely matches' : 'is converging towards'} the theoretical value.`;
        
        // Allow UI to update
        await sleep(10);
    }
}

/**
 * Simulate a single trial with a given group size
 * @param {number} groupSize - Number of people in the trial
 * @returns {boolean} True if a collision occurred, false otherwise
 */
function simulateTrial(groupSize) {
    const birthdays = new Set();
    
    for (let i = 0; i < groupSize; i++) {
        const birthday = generateBirthday();
        if (birthdays.has(birthday)) {
            return true; // Collision found
        }
        birthdays.add(birthday);
    }
    
    return false; // No collision
}

/**
 * Utility function to sleep for a given number of milliseconds
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise} Promise that resolves after the delay
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
