/**
 * Farrer Map Application
 * Interactive map with MapLibre and OpenFreeMap
 */

// Sydney CBD coordinates
const SYDNEY_CBD = {
    lng: 143.6197900429576,
    lat: -34.626968529388,
    zoom: 8
};

const BOOTHS_GEOJSON_PATH = 'booths.geojson';
const FARRER_GEOJSON_PATH = 'farrer.geojson';
const SA1_GEOJSON_PATH = 'sa1_2021.geojson';
const SA1_CSV_2025 = '2025_sa1s.csv';
const SA1_CSV_2022 = '2022_sa1s.csv';

// Map instance
let map;

// Cached SA1 boundary GeoJSON (shared between years)
let sa1GeoJSONCache = null;

// Registry of all election layers for mutual-exclusion
const electionLayers = [];

/** Metric configuration: colors and display range */
const METRIC_CONFIG = {
    fp_alp: {
        label: 'ALP First Preference',
        min: 0, max: 0.55,
        colorStops: [0, '#ffffff', 0.55, '#710713'],
        legendGradient: 'linear-gradient(to right, #ffffff, #710713)',
        legendMin: '0%', legendMax: '55%'
    },
    fp_lnp: {
        label: 'LIB First Preference',
        min: 0, max: 0.55,
        colorStops: [0, '#ffffff', 0.55, '#003087'],
        legendGradient: 'linear-gradient(to right, #ffffff, #003087)',
        legendMin: '0%', legendMax: '55%'
    },
    tcp_lnp: {
        label: 'LIB Two-Candidate Preferred',
        min: 0, max: 1,
        colorStops: [0, '#e3142d', 0.5, '#ffffff', 1, '#003087'],
        legendGradient: 'linear-gradient(to right, #e3142d, #ffffff, #003087)',
        legendMin: 'ALP 100%', legendMax: 'LIB 100%'
    }
};

/**
 * Parse a CSV string into an array of objects using the header row as keys.
 * @param {string} text - Raw CSV text
 * @returns {Object[]}
 */
function parseCSV(text) {
    const lines = text.trim().split('\n');
    // Remove BOM if present
    const headers = lines[0].replace(/^\uFEFF/, '').split(',');
    return lines.slice(1).map((line) => {
        const values = line.split(',');
        return Object.fromEntries(headers.map((h, i) => [h, values[i]]));
    });
}

/**
 * Build a MapLibre fill-color paint expression for the given metric.
 * @param {string} metric - Property name on each feature
 * @returns {Array} MapLibre expression
 */
function buildColorExpression(metric) {
    const cfg = METRIC_CONFIG[metric];
    const stops = cfg.colorStops; // [val, color, val, color, ...]
    const interp = [
        'interpolate', ['linear'],
        ['coalesce', ['get', metric], -1]
    ];
    // No-data features: -1 → transparent handled by case expression
    const expr = [
        'case',
        ['<', ['coalesce', ['get', metric], -1], 0],
        'rgba(0,0,0,0)',
        [...interp, ...stops]
    ];
    return expr;
}

/**
 * Update the legend display for the given metric and year.
 * @param {string} metric
 * @param {string} year
 */
function updateLegend(metric, year) {
    const cfg = METRIC_CONFIG[metric];
    const bar = document.querySelector(`.sa1-legend-bar[data-legend="${year}"]`);
    const minLabel = document.querySelector(`.sa1-legend-min[data-legend="${year}"]`);
    const maxLabel = document.querySelector(`.sa1-legend-max[data-legend="${year}"]`);
    if (bar) bar.style.background = cfg.legendGradient;
    if (minLabel) minLabel.textContent = cfg.legendMin;
    if (maxLabel) maxLabel.textContent = cfg.legendMax;
}

/**
 * Keep map container aligned to the bottom of the sticky header
 */
function updateMapContainerOffset() {
    const header = document.querySelector('.header');
    const mapContainer = document.querySelector('.map-container');
    if (!mapContainer) {
        return;
    }

    const headerHeight = header ? Math.ceil(header.getBoundingClientRect().height) : 0;
    document.documentElement.style.setProperty('--farrer-header-offset', `${headerHeight}px`);

    if (map) {
        map.resize();
    }
}

/**
 * Initialize the map with MapLibre and OpenFreeMap
 */
function initMap() {
    map = new maplibregl.Map({
        container: 'map',
        style: 'https://tiles.openfreemap.org/styles/liberty',
        center: [SYDNEY_CBD.lng, SYDNEY_CBD.lat],
        zoom: SYDNEY_CBD.zoom,
        attributionControl: true
    });

    // Add navigation controls
    map.addControl(new maplibregl.NavigationControl(), 'top-right');

    // Add scale control
    map.addControl(new maplibregl.ScaleControl(), 'bottom-left');

    // Wait for map to load before adding markers
    map.on('load', () => {
        addFarrerLayer();
        addBoothsLayer();
        addElectionLayer({ year: '2025', csvPath: SA1_CSV_2025 });
        addElectionLayer({ year: '2022', csvPath: SA1_CSV_2022 });
    });
}

/**
 * Add Farrer boundary layer to the map
 */
async function addFarrerLayer() {
    try {
        const response = await fetch(FARRER_GEOJSON_PATH);
        if (!response.ok) {
            throw new Error(`Failed to load Farrer boundary: ${response.status} ${response.statusText}`);
        }

        const farrerGeoJSON = await response.json();

        map.addSource('farrer-boundary', {
            type: 'geojson',
            data: farrerGeoJSON
        });

        map.addLayer({
            id: 'farrer-fill',
            type: 'fill',
            source: 'farrer-boundary',
            paint: {
                'fill-color': '#22c55e',
                'fill-opacity': 0.15
            }
        });

        map.addLayer({
            id: 'farrer-outline',
            type: 'line',
            source: 'farrer-boundary',
            paint: {
                'line-color': '#166534',
                'line-width': 2,
                'line-opacity': 0.8
            }
        });
    } catch (error) {
        console.error('Error loading Farrer boundary:', error);
    }
}

/**
 * Add booths layer to the map
 */
async function addBoothsLayer() {
    try {
        const response = await fetch(BOOTHS_GEOJSON_PATH);
        if (!response.ok) {
            throw new Error(`Failed to load booths data: ${response.status} ${response.statusText}`);
        }

        const boothsGeoJSON = await response.json();

        const bounds = new maplibregl.LngLatBounds();
        boothsGeoJSON.features.forEach((feature) => {
            bounds.extend(feature.geometry.coordinates);
        });

        if (!bounds.isEmpty()) {
            map.fitBounds(bounds, { padding: 120, maxZoom: 15 });
        }

        boothsGeoJSON.features.forEach((feature) => {
            const { properties } = feature;
            const markerEl = document.createElement('button');
            markerEl.type = 'button';
            markerEl.style.width = '12px';
            markerEl.style.height = '12px';
            markerEl.style.borderRadius = '50%';
            markerEl.style.backgroundColor = '#6366f1';
            markerEl.style.border = '2px solid #ffffff';
            markerEl.style.boxShadow = '0 1px 4px rgba(0, 0, 0, 0.35)';
            markerEl.style.padding = '0';
            markerEl.style.display = 'block';
            markerEl.style.boxSizing = 'border-box';
            markerEl.style.appearance = 'none';
            markerEl.style.cursor = 'pointer';

            const popupContent = `
                <div class="popup-title">${properties.PPName}</div>
                <div class="popup-details">
                    <p><strong>Where:</strong> ${properties.PremisesName}</p>
                    <p><strong>Address:</strong> ${properties.Address1} ${properties.Locality}</p>
                </div>
            `;

            new maplibregl.Marker({ element: markerEl })
                .setLngLat(feature.geometry.coordinates)
                .setPopup(new maplibregl.Popup({ offset: 20 }).setHTML(popupContent))
                .addTo(map);
        });
    } catch (error) {
        console.error('Error loading booths layer:', error);
    }
}

/**
 * Load SA1 boundary GeoJSON (cached) and an election CSV, join them, and add as MapLibre layers.
 * @param {{ year: string, csvPath: string }} config
 */
async function addElectionLayer({ year, csvPath }) {
    const fillId = `sa1-fill-${year}`;
    const outlineId = `sa1-outline-${year}`;
    const sourceId = `sa1-results-${year}`;

    try {
        // Fetch SA1 GeoJSON (cached) and CSV in parallel
        const csvPromise = fetch(csvPath).then((r) => {
            if (!r.ok) throw new Error(`Failed to load ${csvPath}: ${r.status}`);
            return r.text();
        });

        if (!sa1GeoJSONCache) {
            const res = await fetch(SA1_GEOJSON_PATH);
            if (!res.ok) throw new Error(`Failed to load SA1 GeoJSON: ${res.status}`);
            sa1GeoJSONCache = await res.json();
        }

        const csvText = await csvPromise;
        const csvRows = parseCSV(csvText);

        // Build lookup: sa1 code → row
        const csvByCode = {};
        csvRows.forEach((row) => { csvByCode[row.sa1] = row; });

        // Deep-clone boundary GeoJSON and merge this year's CSV data into properties
        const geojson = JSON.parse(JSON.stringify(sa1GeoJSONCache));
        geojson.features.forEach((feature) => {
            const code = feature.properties.sa1_2021_short;
            const row = csvByCode[code];
            if (row) {
                feature.properties.fp_alp = parseFloat(row.fp_alp);
                feature.properties.fp_lnp = parseFloat(row.fp_lnp);
                feature.properties.tcp_lnp = parseFloat(row.tcp_lnp);
            }
        });

        map.addSource(sourceId, { type: 'geojson', data: geojson });

        map.addLayer({
            id: fillId,
            type: 'fill',
            source: sourceId,
            layout: { visibility: 'none' },
            paint: {
                'fill-color': buildColorExpression('fp_alp'),
                'fill-opacity': 0.9
            }
        }, 'farrer-fill');

        map.addLayer({
            id: outlineId,
            type: 'line',
            source: sourceId,
            layout: { visibility: 'none' },
            paint: {
                'line-color': '#374151',
                'line-width': 0.5,
                'line-opacity': 0.5
            }
        }, 'farrer-fill');

        // Per-year state
        const state = { visible: false, metric: 'fp_alp' };

        // Hover tooltip (shared element, updated on mousemove)
        const tooltip = document.createElement('div');
        tooltip.className = 'sa1-tooltip';
        tooltip.style.display = 'none';
        document.body.appendChild(tooltip);

        map.on('mousemove', fillId, (e) => {
            if (!state.visible) return;
            map.getCanvas().style.cursor = 'pointer';
            const props = e.features[0].properties;
            const fmt = (v) => (v != null && !isNaN(v) ? `${(parseFloat(v) * 100).toFixed(1)}%` : 'No data');
            tooltip.innerHTML = `
                <strong>SA1 ${props.sa1_2021_short}</strong><br>
                ALP FP: ${fmt(props.fp_alp)}<br>
                LIB FP: ${fmt(props.fp_lnp)}<br>
                LIB TCP: ${fmt(props.tcp_lnp)}
            `.trim();
            tooltip.style.display = 'block';
            tooltip.style.left = `${e.originalEvent.pageX + 12}px`;
            tooltip.style.top = `${e.originalEvent.pageY - 28}px`;
        });

        map.on('mouseleave', fillId, () => {
            map.getCanvas().style.cursor = '';
            tooltip.style.display = 'none';
        });

        initElectionControls({ year, fillId, outlineId }, state);
    } catch (error) {
        console.error(`Error loading ${year} election layer:`, error);
    }
}

/**
 * Wire up toggle button and metric radio buttons for one election year.
 * @param {{ year: string, fillId: string, outlineId: string }} config
 * @param {{ visible: boolean, metric: string }} state
 */
function initElectionControls({ year, fillId, outlineId }, state) {
    const toggleBtn = document.getElementById(`sa1-toggle-${year}`);
    const options = document.getElementById(`sa1-options-${year}`);
    const radios = document.querySelectorAll(`input[name="sa1-metric-${year}"]`);

    // Register this layer for mutual-exclusion
    const entry = { state, fillId, outlineId, toggleBtn, options };
    electionLayers.push(entry);

    toggleBtn.addEventListener('click', () => {
        // If turning ON, deactivate all other layers first
        if (!state.visible) {
            electionLayers.forEach((other) => {
                if (other === entry || !other.state.visible) return;
                other.state.visible = false;
                map.setLayoutProperty(other.fillId, 'visibility', 'none');
                map.setLayoutProperty(other.outlineId, 'visibility', 'none');
                other.toggleBtn.setAttribute('aria-pressed', false);
                other.toggleBtn.classList.remove('active');
                other.options.hidden = true;
            });
        }

        state.visible = !state.visible;
        const vis = state.visible ? 'visible' : 'none';
        map.setLayoutProperty(fillId, 'visibility', vis);
        map.setLayoutProperty(outlineId, 'visibility', vis);
        toggleBtn.setAttribute('aria-pressed', state.visible);
        toggleBtn.classList.toggle('active', state.visible);
        options.hidden = !state.visible;
        if (state.visible) updateLegend(state.metric, year);
    });

    radios.forEach((radio) => {
        radio.addEventListener('change', () => {
            state.metric = radio.value;
            map.setPaintProperty(fillId, 'fill-color', buildColorExpression(state.metric));
            updateLegend(state.metric, year);
        });
    });

    updateLegend(state.metric, year);
}

/**
 * Initialize the application
 */
document.addEventListener('DOMContentLoaded', () => {
    updateMapContainerOffset();
    initMap();
    window.addEventListener('resize', updateMapContainerOffset);
});
