/**
 * Australian Population Viewer
 * Visualizes population changes across Australian states over time
 */

// State configuration
const STATE_NAMES = {
    'NSW': 'New South Wales',
    'Vic': 'Victoria',
    'Qld': 'Queensland',
    'SA': 'South Australia',
    'WA': 'Western Australia',
    'Tas': 'Tasmania',
    'NT': 'Northern Territory',
    'ACT': 'Australian Capital Territory'
};

const STATE_COLORS = {
    'NSW': '#3b82f6',
    'Vic': '#8b5cf6',
    'Qld': '#ec4899',
    'SA': '#f59e0b',
    'WA': '#10b981',
    'Tas': '#06b6d4',
    'NT': '#f97316',
    'ACT': '#6366f1'
};

// Global data storage
let populationData = [];
let currentIndex = 0;
let scrollTicking = false;

// Constants for full population range (for fixed axis)
let MIN_POPULATION = Infinity;
let MAX_POPULATION = -Infinity;

// Timeline configuration
const QUARTERS_PER_MILESTONE = 20; // ~5 years
const TIMELINE_SPACING_MULTIPLIER = 2;
const COLUMN_HEIGHT_SCALE = 1.5;

/**
 * Initialize the application
 */
document.addEventListener('DOMContentLoaded', async function() {
    try {
        await loadPopulationData();
        initializeApp();
    } catch (error) {
        console.error('Error initializing app:', error);
        displayError('Failed to load population data. Please try again.');
    }
});

/**
 * Load and parse CSV data
 */
async function loadPopulationData() {
    const response = await fetch('../../data/australia_population_20250918.csv');
    
    if (!response.ok) {
        throw new Error(`Failed to load CSV: ${response.status} ${response.statusText}`);
    }
    
    const csvText = await response.text();
    
    const lines = csvText.trim().split('\n');
    const headers = lines[0].split(',');
    
    // Skip first two rows (headers and abbreviations)
    for (let i = 2; i < lines.length; i++) {
        const values = lines[i].split(',');
        const date = values[0];
        
        const dataPoint = {
            date: new Date(date),
            dateString: formatDate(new Date(date)),
            NSW: parseInt(values[1], 10),
            Vic: parseInt(values[2], 10),
            Qld: parseInt(values[3], 10),
            SA: parseInt(values[4], 10),
            WA: parseInt(values[5], 10),
            Tas: parseInt(values[6], 10),
            NT: parseInt(values[7], 10),
            ACT: parseInt(values[8], 10),
            Aus: parseInt(values[9], 10)
        };
        
        populationData.push(dataPoint);
    }
}

/**
 * Initialize the application
 */
function initializeApp() {
    // Calculate min/max for the entire dataset
    populationData.forEach(data => {
        MIN_POPULATION = Math.min(MIN_POPULATION, data.Aus);
        MAX_POPULATION = Math.max(MAX_POPULATION, data.Aus);
    });
    
    createTimeline();
    setupScrollListener();
    
    // Set initial index to earliest data
    currentIndex = 0;
    
    updateVisualization(currentIndex);
    updateTimelineIndicator();
}

/**
 * Setup scroll listener for page scroll
 */
function setupScrollListener() {
    window.addEventListener('scroll', () => {
        if (!scrollTicking) {
            window.requestAnimationFrame(() => {
                updateFromScroll();
                scrollTicking = false;
            });
            scrollTicking = true;
        }
    });
}

/**
 * Update visualization based on scroll position
 */
function updateFromScroll() {
    const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
    const scrollPosition = window.scrollY;
    
    if (scrollHeight <= 0) return;
    
    // Map scroll position to data index
    const scrollPercent = scrollPosition / scrollHeight;
    const newIndex = Math.floor(scrollPercent * (populationData.length - 1));
    
    if (newIndex !== currentIndex && newIndex >= 0 && newIndex < populationData.length) {
        currentIndex = newIndex;
        updateVisualization(currentIndex);
        updateTimelineIndicator();
    }
}

/**
 * Create timeline elements - show key milestones only
 */
function createTimeline() {
    const timeline = document.getElementById('timeline');
    
    // Clear existing content
    timeline.innerHTML = '';
    
    // Create milestone indices: start, every 5 years, and end
    const milestoneIndices = [];
    
    // Add start
    milestoneIndices.push(0);
    
    // Add milestones every ~5 years
    for (let i = QUARTERS_PER_MILESTONE; i < populationData.length - 1; i += QUARTERS_PER_MILESTONE) {
        milestoneIndices.push(i);
    }
    
    // Add end
    if (milestoneIndices[milestoneIndices.length - 1] !== populationData.length - 1) {
        milestoneIndices.push(populationData.length - 1);
    }
    
    // Create timeline items for milestones
    milestoneIndices.forEach((index, i) => {
        const data = populationData[index];
        const item = document.createElement('div');
        item.className = 'timeline-item';
        
        // Position absolutely based on percentage of total duration
        const percent = (index / (populationData.length - 1)) * 100;
        item.style.position = 'absolute';
        item.style.top = `${percent}%`;
        item.style.width = '100%';
        item.style.margin = '0';
        item.style.transform = 'translateY(-50%)';
        
        item.innerHTML = `<div class="timeline-item-date">${data.dateString}</div>`;
        
        item.addEventListener('click', () => {
            currentIndex = index;
            updateVisualization(index);
            updateTimelineIndicator();
            // Scroll page to match timeline position
            const scrollPercent = index / (populationData.length - 1);
            const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
            window.scrollTo({ top: scrollPercent * scrollHeight, behavior: 'smooth' });
        });
        
        timeline.appendChild(item);
    });
    
    // Add current position indicator
    const indicator = document.createElement('div');
    indicator.className = 'timeline-current-indicator';
    indicator.id = 'timeline-indicator';
    timeline.appendChild(indicator);
}

/**
 * Update timeline position indicator
 */
function updateTimelineIndicator() {
    const indicator = document.getElementById('timeline-indicator');
    const timeline = document.getElementById('timeline');
    
    if (!indicator || !timeline) return;
    
    // Calculate position as percentage of timeline height
    const percent = currentIndex / (populationData.length - 1);
    const timelineHeight = timeline.clientHeight;
    const position = percent * timelineHeight;
    
    indicator.style.top = `${position}px`;
}

/**
 * Update all visualizations
 */
function updateVisualization(index) {
    const data = populationData[index];
    
    // Update title
    document.getElementById('current-date').textContent = data.dateString;
    document.getElementById('total-population').textContent = 
        `Population: ${formatNumber(data.Aus)}`;
    
    // Update charts
    updateBarChart(data);
    updatePercentageChart(data);
    updateLineChart(index);
}

/**
 * Update bar chart (population numbers)
 */
function updateBarChart(data) {
    const container = document.getElementById('population-chart');
    
    const states = Object.keys(STATE_NAMES);
    const maxPopulation = Math.max(...states.map(state => data[state]));
    
    let html = '<div class="bar-chart">';
    
    states.forEach(state => {
        const population = data[state];
        const percentage = (population / maxPopulation) * 100;
        
        html += `
            <div class="bar-item">
                <div class="bar-label">${state}</div>
                <div class="bar-container">
                    <div class="bar-fill" style="width: ${percentage}%; background: ${STATE_COLORS[state]};">
                        <span class="bar-value">${formatNumber(population)}</span>
                    </div>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    container.innerHTML = html;
}

/**
 * Update percentage chart - vertical column chart
 */
function updatePercentageChart(data) {
    const container = document.getElementById('percentage-chart');
    
    const states = Object.keys(STATE_NAMES);
    const total = data.Aus;
    
    // Calculate percentages
    const stateData = states.map(state => ({
        state,
        population: data[state],
        percentage: (data[state] / total) * 100
    }));
    
    // Find max percentage for scaling
    const maxPercentage = Math.max(...stateData.map(d => d.percentage));
    
    let html = '<div class="percentage-chart-container">';
    
    stateData.forEach(({ state, percentage }) => {
        const height = (percentage / maxPercentage) * 100;
        
        html += `
            <div class="percentage-column">
                <div class="percentage-bar" style="height: ${height * COLUMN_HEIGHT_SCALE}px;">
                    <div class="percentage-bar-fill" style="height: 100%; background-color: ${STATE_COLORS[state]};"></div>
                </div>
                <div class="percentage-label-container">
                    <div class="percentage-state-label">${state}</div>
                    <div class="percentage-value">${percentage.toFixed(1)}%</div>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    container.innerHTML = html;
}

/**
 * Update line chart (total population over time)
 * Fixed axis that doesn't change
 */
function updateLineChart(currentIdx) {
    const container = document.getElementById('line-chart');
    
    // Only show data up to current index
    const dataToShow = populationData.slice(0, currentIdx + 1);
    
    if (dataToShow.length === 0) return;
    
    // SVG dimensions
    const width = container.clientWidth || 600;
    const height = 200;
    const padding = { top: 15, right: 15, bottom: 30, left: 50 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    
    // Use fixed min/max from entire dataset
    const minPop = MIN_POPULATION;
    const maxPop = MAX_POPULATION;
    const popRange = maxPop - minPop;
    
    // Create SVG
    let svg = `<svg class="line-chart-svg" width="100%" height="${height}" viewBox="0 0 ${width} ${height}">`;
    
    // Add gradient
    svg += `
        <defs>
            <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" style="stop-color:#6366f1;stop-opacity:0.6" />
                <stop offset="100%" style="stop-color:#6366f1;stop-opacity:0" />
            </linearGradient>
        </defs>
    `;
    
    // Add grid lines (based on full range)
    for (let i = 0; i <= 4; i++) {
        const y = padding.top + (chartHeight / 4) * i;
        svg += `<line class="line-grid" x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}" />`;
        
        const value = maxPop - (popRange / 4) * i;
        svg += `<text class="line-label" x="${padding.left - 5}" y="${y + 3}" text-anchor="end">${formatNumberShort(value)}</text>`;
    }
    
    // Generate path data (using full data length for x-axis)
    let pathData = '';
    let areaData = '';
    
    dataToShow.forEach((data, index) => {
        // Use full dataset length for x positioning
        const x = padding.left + (chartWidth / (populationData.length - 1)) * index;
        const y = padding.top + chartHeight - ((data.Aus - minPop) / popRange) * chartHeight;
        
        if (index === 0) {
            pathData += `M ${x} ${y}`;
            areaData += `M ${x} ${height - padding.bottom}`;
            areaData += ` L ${x} ${y}`;
        } else {
            pathData += ` L ${x} ${y}`;
            areaData += ` L ${x} ${y}`;
        }
        
        // Add point
        if (index === dataToShow.length - 1) {
            svg += `<circle cx="${x}" cy="${y}" r="4" fill="#6366f1" />`;
        }
    });
    
    // Close area path
    const lastIdx = dataToShow.length - 1;
    const lastX = padding.left + (chartWidth / (populationData.length - 1)) * lastIdx;
    areaData += ` L ${lastX} ${height - padding.bottom} Z`;
    
    // Add area and line
    svg += `<path class="line-area" d="${areaData}" />`;
    svg += `<path class="line-path" d="${pathData}" />`;
    
    // Add x-axis labels (based on full range)
    const firstYear = populationData[0].date.getFullYear();
    const lastYear = populationData[populationData.length - 1].date.getFullYear();
    const midYear = Math.floor((firstYear + lastYear) / 2);
    
    [
        { year: firstYear, x: padding.left },
        { year: midYear, x: padding.left + chartWidth / 2 },
        { year: lastYear, x: padding.left + chartWidth }
    ].forEach(({ year, x }) => {
        svg += `<text class="line-label" x="${x}" y="${height - padding.bottom + 15}" text-anchor="middle">${year}</text>`;
    });
    
    svg += '</svg>';
    
    container.innerHTML = svg;
}

/**
 * Format date to readable string (full month name)
 */
function formatDate(date) {
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                    'July', 'August', 'September', 'October', 'November', 'December'];
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    return `${month} ${year}`;
}

/**
 * Format number with thousand separators
 */
function formatNumber(num) {
    return num.toLocaleString('en-AU');
}

/**
 * Format number in short form (e.g., 14.2M)
 */
function formatNumberShort(num) {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
        return (num / 1000).toFixed(0) + 'K';
    }
    return num.toString();
}

/**
 * Display error message
 */
function displayError(message) {
    const main = document.querySelector('.population-viewer');
    main.innerHTML = `
        <div class="title-section">
            <h1>Error</h1>
            <p style="color: var(--text-secondary);">${message}</p>
        </div>
    `;
}
