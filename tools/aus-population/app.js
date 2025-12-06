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
            NSW: parseInt(values[1]),
            Vic: parseInt(values[2]),
            Qld: parseInt(values[3]),
            SA: parseInt(values[4]),
            WA: parseInt(values[5]),
            Tas: parseInt(values[6]),
            NT: parseInt(values[7]),
            ACT: parseInt(values[8]),
            Aus: parseInt(values[9])
        };
        
        populationData.push(dataPoint);
    }
}

/**
 * Initialize the application
 */
function initializeApp() {
    createTimeline();
    
    // Set initial index to most recent data
    currentIndex = populationData.length - 1;
    
    updateVisualization(currentIndex);
    updateTimeline(currentIndex);
}

/**
 * Create timeline elements
 */
function createTimeline() {
    const timeline = document.getElementById('timeline');
    
    populationData.forEach((data, index) => {
        const item = document.createElement('div');
        item.className = 'timeline-item';
        item.innerHTML = `
            <div class="timeline-item-date">${data.dateString}</div>
            <div class="timeline-item-population">${formatNumber(data.Aus)} people</div>
        `;
        
        item.addEventListener('click', () => {
            currentIndex = index;
            updateVisualization(index);
            updateTimeline(index);
        });
        
        timeline.appendChild(item);
    });
    
    // Scroll to bottom (most recent) initially
    setTimeout(() => {
        timeline.scrollTop = timeline.scrollHeight;
    }, 100);
}

/**
 * Update timeline active state
 */
function updateTimeline(index) {
    const items = document.querySelectorAll('.timeline-item');
    items.forEach((item, i) => {
        if (i === index) {
            item.classList.add('active');
            // Scroll into view if needed
            item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        } else {
            item.classList.remove('active');
        }
    });
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
 * Update percentage chart
 */
function updatePercentageChart(data) {
    const container = document.getElementById('percentage-chart');
    
    const states = Object.keys(STATE_NAMES);
    const total = data.Aus;
    
    let html = '<div class="percentage-grid">';
    
    states.forEach(state => {
        const population = data[state];
        const percentage = ((population / total) * 100).toFixed(1);
        
        html += `
            <div class="percentage-item">
                <div class="percentage-color" style="background-color: ${STATE_COLORS[state]};"></div>
                <div class="percentage-label">${state}</div>
                <div class="percentage-value">${percentage}%</div>
            </div>
        `;
    });
    
    html += '</div>';
    container.innerHTML = html;
}

/**
 * Update line chart (total population over time)
 */
function updateLineChart(currentIdx) {
    const container = document.getElementById('line-chart');
    
    // Only show data up to current index
    const dataToShow = populationData.slice(0, currentIdx + 1);
    
    if (dataToShow.length === 0) return;
    
    // SVG dimensions
    const width = container.clientWidth || 600;
    const height = 250;
    const padding = { top: 20, right: 20, bottom: 40, left: 60 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    
    // Get min and max values
    const populations = dataToShow.map(d => d.Aus);
    const minPop = Math.min(...populations);
    const maxPop = Math.max(...populations);
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
    
    // Add grid lines
    for (let i = 0; i <= 4; i++) {
        const y = padding.top + (chartHeight / 4) * i;
        svg += `<line class="line-grid" x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}" />`;
        
        const value = maxPop - (popRange / 4) * i;
        svg += `<text class="line-label" x="${padding.left - 10}" y="${y + 4}" text-anchor="end">${formatNumberShort(value)}</text>`;
    }
    
    // Generate path data
    let pathData = '';
    let areaData = '';
    
    dataToShow.forEach((data, index) => {
        // Handle single data point case
        const x = dataToShow.length === 1 
            ? padding.left + chartWidth / 2 
            : padding.left + (chartWidth / (dataToShow.length - 1)) * index;
        
        // Handle case when all values are the same (popRange = 0)
        const y = popRange === 0 
            ? padding.top + chartHeight / 2 
            : padding.top + chartHeight - ((data.Aus - minPop) / popRange) * chartHeight;
        
        if (index === 0) {
            pathData += `M ${x} ${y}`;
            areaData += `M ${x} ${height - padding.bottom}`;
            areaData += ` L ${x} ${y}`;
        } else {
            pathData += ` L ${x} ${y}`;
            areaData += ` L ${x} ${y}`;
        }
        
        // Add point
        svg += `<circle cx="${x}" cy="${y}" r="3" fill="#6366f1" />`;
    });
    
    // Close area path
    const lastX = dataToShow.length === 1 
        ? padding.left + chartWidth / 2 
        : padding.left + (chartWidth / (dataToShow.length - 1)) * (dataToShow.length - 1);
    areaData += ` L ${lastX} ${height - padding.bottom} Z`;
    
    // Add area and line
    svg += `<path class="line-area" d="${areaData}" />`;
    svg += `<path class="line-path" d="${pathData}" />`;
    
    // Add x-axis labels
    const labelIndices = [0, Math.floor(dataToShow.length / 2), dataToShow.length - 1];
    labelIndices.forEach(index => {
        if (index < dataToShow.length) {
            const x = dataToShow.length === 1 
                ? padding.left + chartWidth / 2 
                : padding.left + (chartWidth / (dataToShow.length - 1)) * index;
            const data = dataToShow[index];
            const year = data.date.getFullYear();
            svg += `<text class="line-label" x="${x}" y="${height - padding.bottom + 20}" text-anchor="middle">${year}</text>`;
        }
    });
    
    svg += '</svg>';
    
    container.innerHTML = svg;
}

/**
 * Format date to readable string
 */
function formatDate(date) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
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
