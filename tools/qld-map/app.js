const MAP_CENTRE = {
    lng: 153.03474830977186,
    lat: -27.458663415308703,
    zoom: 9
};

const BEFORE_GEOJSON = 'qld_2017.geojson';
const AFTER_GEOJSON = 'qld_2026_draft.geojson';

let beforeMap, afterMap;

/**
 * Keep map container aligned to the bottom of the sticky header.
 */
function updateMapContainerOffset() {
    const header = document.querySelector('.header');
    const mapContainer = document.querySelector('.map-container');
    if (!mapContainer) return;

    const headerHeight = header ? Math.ceil(header.getBoundingClientRect().height) : 0;
    document.documentElement.style.setProperty('--header-offset', `${headerHeight}px`);

    if (beforeMap) beforeMap.resize();
    if (afterMap) afterMap.resize();
}

/**
 * Add electorate boundary layers to a map instance.
 */
async function addBoundaryLayer(map, geojsonPath, sourceId, { lineColor = '#374151', labelColor = '#000000' } = {}) {
    const response = await fetch(geojsonPath);
    if (!response.ok) throw new Error(`Failed to load ${geojsonPath}: ${response.status}`);
    const data = await response.json();

    map.addSource(sourceId, { type: 'geojson', data });

    const _cs = getComputedStyle(document.documentElement);
    const _partyFill = (p) => _cs.getPropertyValue(`--party-fill-${p.toLowerCase()}`).trim() || '#6b7280';

    map.addLayer({
        id: `${sourceId}-fill`,
        type: 'fill',
        source: sourceId,
        paint: {
            'fill-color': [
                'match',
                ['get', 'party'],
                'ALP', _partyFill('ALP'),
                'LNP', _partyFill('LNP'),
                'GRN', _partyFill('GRN'),
                'KAP', _partyFill('KAP'),
                'IND', _partyFill('IND'),
                '#6b7280'
            ],
            'fill-opacity': 0.5
        }
    });

    map.addLayer({
        id: `${sourceId}-outline`,
        type: 'line',
        source: sourceId,
        paint: {
            'line-color': lineColor,
            'line-width': 1.5,
            'line-opacity': 0.7
        }
    });

    map.addLayer({
        id: `${sourceId}-labels`,
        type: 'symbol',
        source: sourceId,
        layout: {
            'text-field': ['get', 'name'],
            'text-font': ['Noto Sans Regular'],
            'text-size': 11,
            'text-anchor': 'center',
            'text-max-width': 8
        },
        paint: {
            'text-color': labelColor,
            'text-halo-color': '#ffffff',
            'text-halo-width': 2,
            'text-halo-blur': 0.5
        }
    });

    // Hover highlight layer
    map.addLayer({
        id: `${sourceId}-hover`,
        type: 'line',
        source: sourceId,
        paint: {
            'line-color': '#03742e',
            'line-width': 4,
            'line-blur': 3,
            'line-opacity': 0.95
        },
        filter: ['==', 'name', '']
    });
}

/**
 * Wire hover interactions for a map instance.
 */
function setupHover(map, sourceId) {
    const overlay = document.getElementById('district-hover-overlay');
    const overlayPrompt = overlay.querySelector('.district-hover-prompt');
    const overlayInfo = overlay.querySelector('.district-hover-info');
    const overlayName = document.getElementById('district-hover-name');
    const overlayDetail = document.getElementById('district-hover-detail');

    map.on('mousemove', `${sourceId}-fill`, (e) => {
        map.getCanvas().style.cursor = 'pointer';
        const props = e.features[0].properties;
        const name = props.name || 'Unknown';
        const region = props.region || '';
        const party = props.party || '';

        map.setFilter(`${sourceId}-hover`, ['==', 'name', name]);

        overlayName.textContent = name;
        const parts = [];
        if (region) parts.push(region);
        if (party) {
            parts.push(`<span class="district-party-${party.toLowerCase()}">${party}</span>`);
        }
        overlayDetail.innerHTML = parts.join(' · ');

        overlayPrompt.hidden = true;
        overlayInfo.hidden = false;
    });

    map.on('mouseleave', `${sourceId}-fill`, () => {
        map.getCanvas().style.cursor = '';
        map.setFilter(`${sourceId}-hover`, ['==', 'name', '']);
        overlayPrompt.hidden = false;
        overlayInfo.hidden = true;
    });
}

/**
 * Create a map instance with shared settings.
 */
function createMap(container) {
    return new maplibregl.Map({
        container,
        style: 'https://tiles.openfreemap.org/styles/liberty',
        center: [MAP_CENTRE.lng, MAP_CENTRE.lat],
        zoom: MAP_CENTRE.zoom,
        attributionControl: true
    });
}

/**
 * Initialize the application.
 */
document.addEventListener('DOMContentLoaded', () => {
    updateMapContainerOffset();
    window.addEventListener('resize', updateMapContainerOffset);

    beforeMap = createMap('before');
    afterMap = createMap('after');

    // Add controls only to the after (right) map to avoid duplication
    afterMap.addControl(new maplibregl.NavigationControl(), 'top-right');
    afterMap.addControl(new maplibregl.ScaleControl(), 'bottom-left');

    // Read boundary colours from CSS custom properties
    const cs = getComputedStyle(document.documentElement);
    const oldColor = cs.getPropertyValue('--boundary-old').trim();
    const newColor = cs.getPropertyValue('--boundary-new').trim();

    beforeMap.on('load', async () => {
        await addBoundaryLayer(beforeMap, BEFORE_GEOJSON, 'boundary-2017', {
            lineColor: oldColor,
            labelColor: oldColor
        });
        setupHover(beforeMap, 'boundary-2017');
    });

    afterMap.on('load', async () => {
        await addBoundaryLayer(afterMap, AFTER_GEOJSON, 'boundary-2026', {
            lineColor: newColor,
            labelColor: newColor
        });
        setupHover(afterMap, 'boundary-2026');
    });

    // Initialize the compare slider
    new maplibregl.Compare(beforeMap, afterMap, '#comparison-container', {
        orientation: 'vertical'
    });
});
