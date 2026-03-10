const MAP_CENTRE = {
    lng: 153.03474830977186,
    lat: -27.458663415308703,
    zoom: 9
};

const BOUNDARY_GEOJSON_PATH = 'qld_2017.geojson';

// Map instance
let map;

// Registry of all election layers for mutual-exclusion
const electionLayers = [];

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
        center: [MAP_CENTRE.lng, MAP_CENTRE.lat],
        zoom: MAP_CENTRE.zoom,
        attributionControl: true
    });

    // Add navigation controls
    map.addControl(new maplibregl.NavigationControl(), 'top-right');

    // Add scale control
    map.addControl(new maplibregl.ScaleControl(), 'bottom-left');

    // Wait for map to load before adding markers
    map.on('load', () => {
        addElectorateLayer();
        // addElectionLayer({ year: '2025', csvPath: SA1_CSV_2025 });
        // addElectionLayer({ year: '2022', csvPath: SA1_CSV_2022 });
    });
}

/**
 * Add Electorate boundary layer to the map
 */
async function addElectorateLayer() {
    try {
        const response = await fetch(BOUNDARY_GEOJSON_PATH);
        if (!response.ok) {
            throw new Error(`Failed to load Electorate boundary: ${response.status} ${response.statusText}`);
        }

        const farrerGeoJSON = await response.json();

        map.addSource('farrer-boundary', {
            type: 'geojson',
            data: farrerGeoJSON
        });

        // Read party fill colours from CSS custom properties (single source of truth).
        const _cs = getComputedStyle(document.documentElement);

        map.addLayer({
            id: 'farrer-outline',
            type: 'line',
            source: 'farrer-boundary',
            paint: {
                'line-color': '#374151',
                'line-width': 1.5,
                'line-opacity': 0.7
            }
        });

        map.addLayer({
            id: 'farrer-labels',
            type: 'symbol',
            source: 'farrer-boundary',
            layout: {
                'text-field': ['get', 'name'],
                'text-font': ['Noto Sans Regular'],
                'text-size': 11,
                'text-anchor': 'center',
                'text-max-width': 8
            },
            paint: {
                'text-color': '#000000',
                'text-halo-color': '#ffffff',
                'text-halo-width': 2,
                'text-halo-blur': 0.5
            }
        });

        // Hover highlight layer – yellow glow outline, initially hidden
        map.addLayer({
            id: 'boundary-hover',
            type: 'line',
            source: 'farrer-boundary',
            paint: {
                'line-color': '#facc15',
                'line-width': 4,
                'line-blur': 3,
                'line-opacity': 0.95
            },
            filter: ['==', 'name', '']
        });

        // Hover interaction
        const overlay = document.getElementById('district-hover-overlay');
        const overlayPrompt = overlay.querySelector('.district-hover-prompt');
        const overlayInfo = overlay.querySelector('.district-hover-info');
        const overlayName = document.getElementById('district-hover-name');
        const overlayDetail = document.getElementById('district-hover-detail');

        map.on('mousemove', 'farrer-fill', (e) => {
            map.getCanvas().style.cursor = 'pointer';
            const props = e.features[0].properties;
            const districtName = props.name || 'Unknown District';
            const region = props.region || '';
            const party = props.party || '';

            map.setFilter('boundary-hover', ['==', 'name', districtName]);

            overlayName.textContent = districtName;

            const parts = [];
            if (region) parts.push(region);
            if (party) {
                const partySpan = `<span class="district-party-${party.toLowerCase()}">${party}</span>`;
                parts.push(partySpan);
            }
            overlayDetail.innerHTML = parts.join(' · ');

            overlayPrompt.hidden = true;
            overlayInfo.hidden = false;
        });

        map.on('mouseleave', 'farrer-fill', () => {
            map.getCanvas().style.cursor = '';
            map.setFilter('boundary-hover', ['==', 'name', '']);
            overlayPrompt.hidden = false;
            overlayInfo.hidden = true;
        });
    } catch (error) {
        console.error('Error loading Farrer boundary:', error);
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
