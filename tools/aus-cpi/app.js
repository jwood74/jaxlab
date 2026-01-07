/**
 * Australian CPI Calculator
 * Calculate inflation and purchasing power changes over time
 */

// Global data storage
let cpiData = [];
let minDate = null;
let maxDate = null;

/**
 * Initialize the application
 */
document.addEventListener('DOMContentLoaded', async function() {
    try {
        await loadCPIData();
        initializeApp();
    } catch (error) {
        console.error('Error initializing app:', error);
        displayError('Failed to load CPI data. Please try again.');
    }
});

/**
 * Load and parse CPI CSV data
 */
async function loadCPIData() {
    const response = await fetch('../../data/australia_cpi.csv');
    
    if (!response.ok) {
        throw new Error(`Failed to load CSV: ${response.status} ${response.statusText}`);
    }
    
    const csvText = await response.text();
    const lines = csvText.trim().split('\n');
    
    // Skip header row, parse data
    for (let i = 1; i < lines.length; i++) {
        const [dateStr, cpiStr] = lines[i].split(',');
        const date = new Date(dateStr);
        const cpi = parseFloat(cpiStr);
        
        if (!isNaN(date.getTime()) && !isNaN(cpi)) {
            cpiData.push({ date, cpi });
        }
    }
    
    // Sort by date
    cpiData.sort((a, b) => a.date - b.date);
    
    // Set date boundaries
    minDate = cpiData[0].date;
    maxDate = cpiData[cpiData.length - 1].date;
}

/**
 * Initialize the application UI
 */
function initializeApp() {
    // Set date input constraints
    const minDateStr = formatDateInput(minDate);
    const maxDateStr = formatDateInput(maxDate);
    
    const historicalDateInput = document.getElementById('historical-date');
    const presentDateInput = document.getElementById('present-date');
    
    historicalDateInput.min = minDateStr;
    historicalDateInput.max = maxDateStr;
    presentDateInput.min = minDateStr;
    presentDateInput.max = maxDateStr;
    
    // Set default dates (10 years ago for historical, today for present)
    const tenYearsAgo = new Date(maxDate);
    tenYearsAgo.setFullYear(tenYearsAgo.getFullYear() - 10);
    historicalDateInput.value = formatDateInput(tenYearsAgo);
    presentDateInput.value = maxDateStr;
    
    // Set up event listeners
    setupEventListeners();
    
    // Initial calculation
    calculateHistorical();
}

/**
 * Set up event listeners
 */
function setupEventListeners() {
    // Mode toggle buttons
    const modeButtons = document.querySelectorAll('.mode-btn');
    modeButtons.forEach(btn => {
        btn.addEventListener('click', () => switchMode(btn.dataset.mode));
    });
    
    // Historical mode inputs
    document.getElementById('historical-amount').addEventListener('input', calculateHistorical);
    document.getElementById('historical-date').addEventListener('change', calculateHistorical);
    
    // Present mode inputs
    document.getElementById('present-amount').addEventListener('input', calculatePresent);
    document.getElementById('present-date').addEventListener('change', calculatePresent);
}

/**
 * Switch between calculation modes
 */
function switchMode(mode) {
    // Update button states
    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.mode === mode);
    });
    
    // Update calculator display
    document.querySelectorAll('.calculator-mode').forEach(calc => {
        calc.classList.toggle('active', calc.id === `${mode}-mode`);
    });
    
    // Recalculate
    if (mode === 'historical') {
        calculateHistorical();
    } else {
        calculatePresent();
    }
}

/**
 * Calculate historical to present value
 */
function calculateHistorical() {
    const amount = parseFloat(document.getElementById('historical-amount').value);
    const dateStr = document.getElementById('historical-date').value;
    
    if (!amount || !dateStr) return;
    
    const selectedDate = new Date(dateStr);
    const historicalCPI = getCPIForDate(selectedDate);
    const presentCPI = cpiData[cpiData.length - 1].cpi;
    
    // Calculate equivalent value: amount * (presentCPI / historicalCPI)
    const equivalentValue = amount * (presentCPI / historicalCPI);
    const percentageChange = ((presentCPI - historicalCPI) / historicalCPI) * 100;
    
    // Update result display
    document.getElementById('historical-result').textContent = formatCurrency(equivalentValue);
    document.getElementById('historical-details').innerHTML = `
        <strong>$${amount.toFixed(2)}</strong> in <strong>${formatDateDisplay(selectedDate)}</strong><br>
        is equivalent to <strong>${formatCurrency(equivalentValue)}</strong> in <strong>${formatDateDisplay(maxDate)}</strong><br>
        <span style="color: ${percentageChange >= 0 ? 'var(--secondary-color)' : 'var(--error-color)'};">
            ${percentageChange >= 0 ? '+' : ''}${percentageChange.toFixed(1)}% inflation
        </span>
    `;
    
    // Draw chart
    drawChart(selectedDate, maxDate, amount, equivalentValue, 'historical');
}

/**
 * Calculate present to historical value
 */
function calculatePresent() {
    const amount = parseFloat(document.getElementById('present-amount').value);
    const dateStr = document.getElementById('present-date').value;
    
    if (!amount || !dateStr) return;
    
    const selectedDate = new Date(dateStr);
    const historicalCPI = getCPIForDate(selectedDate);
    const presentCPI = cpiData[cpiData.length - 1].cpi;
    
    // Calculate equivalent value: amount * (historicalCPI / presentCPI)
    const equivalentValue = amount * (historicalCPI / presentCPI);
    const percentageChange = ((historicalCPI - presentCPI) / presentCPI) * 100;
    
    // Update result display
    document.getElementById('present-result').textContent = formatCurrency(equivalentValue);
    document.getElementById('present-details').innerHTML = `
        <strong>$${amount.toFixed(2)}</strong> in <strong>${formatDateDisplay(maxDate)}</strong><br>
        is equivalent to <strong>${formatCurrency(equivalentValue)}</strong> in <strong>${formatDateDisplay(selectedDate)}</strong><br>
        <span style="color: ${percentageChange <= 0 ? 'var(--secondary-color)' : 'var(--error-color)'};">
            ${percentageChange >= 0 ? '+' : ''}${percentageChange.toFixed(1)}% deflation
        </span>
    `;
    
    // Draw chart
    drawChart(selectedDate, maxDate, equivalentValue, amount, 'present');
}

/**
 * Get CPI value for a specific date (interpolate if needed)
 */
function getCPIForDate(targetDate) {
    // Find exact match or closest dates
    for (let i = 0; i < cpiData.length; i++) {
        if (cpiData[i].date.getTime() === targetDate.getTime()) {
            return cpiData[i].cpi;
        }
        
        if (cpiData[i].date > targetDate) {
            // Interpolate between previous and current
            if (i === 0) return cpiData[0].cpi;
            
            const prev = cpiData[i - 1];
            const curr = cpiData[i];
            const ratio = (targetDate - prev.date) / (curr.date - prev.date);
            return prev.cpi + ratio * (curr.cpi - prev.cpi);
        }
    }
    
    // If date is after all data, return last CPI
    return cpiData[cpiData.length - 1].cpi;
}

/**
 * Draw purchasing power chart
 */
function drawChart(startDate, endDate, startValue, endValue, mode) {
    const chartElement = document.getElementById('cpi-chart');
    chartElement.innerHTML = ''; // Clear existing chart
    
    // Create tooltip element
    let tooltip = document.getElementById('chart-tooltip');
    if (!tooltip) {
        tooltip = document.createElement('div');
        tooltip.id = 'chart-tooltip';
        tooltip.className = 'chart-tooltip';
        const parent = chartElement.parentElement;
        // Ensure parent has relative positioning for tooltip
        if (!parent.style.position || parent.style.position === 'static') {
            parent.style.position = 'relative';
        }
        parent.appendChild(tooltip);
    }
    
    // Generate data points for the chart
    const chartData = [];
    const startCPI = getCPIForDate(startDate);
    const endCPI = getCPIForDate(endDate);
    
    cpiData.forEach(point => {
        if (point.date >= startDate && point.date <= endDate) {
            let value;
            if (mode === 'historical') {
                // Historical to Present: show how startValue grows to endValue
                value = startValue * (point.cpi / startCPI);
            } else {
                // Present to Historical: show how endValue shrinks to startValue going back in time
                value = endValue * (point.cpi / endCPI);
            }
            chartData.push({ date: point.date, value });
        }
    });
    
    if (chartData.length === 0) return;
    
    // Chart dimensions
    const margin = { top: 20, right: 30, bottom: 50, left: 70 };
    const width = chartElement.clientWidth - margin.left - margin.right;
    const height = 300 - margin.top - margin.bottom;
    
    // Create SVG
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', chartElement.clientWidth);
    svg.setAttribute('height', 300);
    
    // Create gradient
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    const gradient = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
    gradient.setAttribute('id', 'gradient');
    gradient.setAttribute('x1', '0%');
    gradient.setAttribute('y1', '0%');
    gradient.setAttribute('x2', '0%');
    gradient.setAttribute('y2', '100%');
    
    const stop1 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
    stop1.setAttribute('offset', '0%');
    stop1.setAttribute('style', 'stop-color:#6366f1;stop-opacity:0.5');
    
    const stop2 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
    stop2.setAttribute('offset', '100%');
    stop2.setAttribute('style', 'stop-color:#6366f1;stop-opacity:0');
    
    gradient.appendChild(stop1);
    gradient.appendChild(stop2);
    defs.appendChild(gradient);
    svg.appendChild(defs);
    
    // Create group for chart
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('transform', `translate(${margin.left},${margin.top})`);
    
    // Scales
    const minValue = Math.min(...chartData.map(d => d.value));
    const maxValue = Math.max(...chartData.map(d => d.value));
    const valueRange = maxValue - minValue;
    const yMin = minValue - valueRange * 0.1;
    const yMax = maxValue + valueRange * 0.1;
    
    const xScale = (date) => {
        const totalTime = endDate - startDate;
        const elapsed = date - startDate;
        return (elapsed / totalTime) * width;
    };
    
    const yScale = (value) => {
        return height - ((value - yMin) / (yMax - yMin)) * height;
    };
    
    // Draw grid lines
    const gridLines = 5;
    for (let i = 0; i <= gridLines; i++) {
        const y = (height / gridLines) * i;
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', 0);
        line.setAttribute('y1', y);
        line.setAttribute('x2', width);
        line.setAttribute('y2', y);
        line.setAttribute('class', 'chart-grid');
        g.appendChild(line);
    }
    
    // Draw axes
    const xAxis = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    xAxis.setAttribute('x1', 0);
    xAxis.setAttribute('y1', height);
    xAxis.setAttribute('x2', width);
    xAxis.setAttribute('y2', height);
    xAxis.setAttribute('class', 'chart-axis');
    g.appendChild(xAxis);
    
    const yAxis = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    yAxis.setAttribute('x1', 0);
    yAxis.setAttribute('y1', 0);
    yAxis.setAttribute('x2', 0);
    yAxis.setAttribute('y2', height);
    yAxis.setAttribute('class', 'chart-axis');
    g.appendChild(yAxis);
    
    // Draw area under line
    let areaPath = `M 0,${height}`;
    chartData.forEach((point, i) => {
        const x = xScale(point.date);
        const y = yScale(point.value);
        if (i === 0) {
            areaPath += ` L ${x},${y}`;
        } else {
            areaPath += ` L ${x},${y}`;
        }
    });
    areaPath += ` L ${width},${height} Z`;
    
    const area = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    area.setAttribute('d', areaPath);
    area.setAttribute('class', 'chart-area');
    g.appendChild(area);
    
    // Draw line
    let linePath = '';
    chartData.forEach((point, i) => {
        const x = xScale(point.date);
        const y = yScale(point.value);
        linePath += `${i === 0 ? 'M' : 'L'} ${x},${y} `;
    });
    
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    line.setAttribute('d', linePath);
    line.setAttribute('class', 'chart-line');
    g.appendChild(line);
    
    // Draw dots with tooltip functionality
    chartData.forEach(point => {
        const x = xScale(point.date);
        const y = yScale(point.value);
        
        const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        dot.setAttribute('cx', x);
        dot.setAttribute('cy', y);
        dot.setAttribute('r', 4);
        dot.setAttribute('class', 'chart-dot');
        dot.style.cursor = 'pointer';
        
        // Add hover events for tooltip
        dot.addEventListener('mouseenter', (e) => {
            tooltip.innerHTML = `
                <div class="chart-tooltip-date">${formatDateDisplay(point.date)}</div>
                <div class="chart-tooltip-value">${formatCurrency(point.value)}</div>
            `;
            tooltip.classList.add('visible');
            
            // Position tooltip near the dot relative to the chart element
            const chartRect = chartElement.getBoundingClientRect();
            const parentRect = chartElement.parentElement.getBoundingClientRect();
            const dotX = parseFloat(dot.getAttribute('cx')) + margin.left;
            const dotY = parseFloat(dot.getAttribute('cy')) + margin.top;
            
            // Calculate position relative to parent container
            const offsetX = chartRect.left - parentRect.left;
            const offsetY = chartRect.top - parentRect.top;
            
            tooltip.style.left = `${offsetX + dotX + 10}px`;
            tooltip.style.top = `${offsetY + dotY - 10}px`;
        });
        
        dot.addEventListener('mouseleave', () => {
            tooltip.classList.remove('visible');
        });
        
        g.appendChild(dot);
    });
    
    // Y-axis labels
    for (let i = 0; i <= gridLines; i++) {
        const value = yMin + (yMax - yMin) * (1 - i / gridLines);
        const y = (height / gridLines) * i;
        
        const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        label.setAttribute('x', -10);
        label.setAttribute('y', y + 4);
        label.setAttribute('text-anchor', 'end');
        label.setAttribute('class', 'chart-label');
        label.textContent = formatCurrency(value, false);
        g.appendChild(label);
    }
    
    // X-axis labels
    const numXLabels = Math.min(5, chartData.length);
    for (let i = 0; i < numXLabels; i++) {
        const index = Math.floor((chartData.length - 1) * (i / (numXLabels - 1)));
        const point = chartData[index];
        const x = xScale(point.date);
        
        const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        label.setAttribute('x', x);
        label.setAttribute('y', height + 20);
        label.setAttribute('text-anchor', 'middle');
        label.setAttribute('class', 'chart-label');
        label.textContent = formatDateShort(point.date);
        g.appendChild(label);
    }
    
    svg.appendChild(g);
    chartElement.appendChild(svg);
}

/**
 * Format date for input element (YYYY-MM-DD)
 */
function formatDateInput(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Format date for display (e.g., "Sep 2020")
 */
function formatDateDisplay(date) {
    const options = { year: 'numeric', month: 'short' };
    return date.toLocaleDateString('en-AU', options);
}

/**
 * Format date for chart labels (e.g., "Sep '20")
 */
function formatDateShort(date) {
    const month = date.toLocaleDateString('en-AU', { month: 'short' });
    const year = String(date.getFullYear()).slice(-2);
    return `${month} '${year}`;
}

/**
 * Format currency
 */
function formatCurrency(amount, includeSymbol = true) {
    const formatted = amount.toFixed(2);
    return includeSymbol ? `$${formatted}` : formatted;
}

/**
 * Display error message
 */
function displayError(message) {
    console.error(message);
    alert(message);
}
