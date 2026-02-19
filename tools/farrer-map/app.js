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
// Map instance
let map;

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
 * Initialize the application
 */
document.addEventListener('DOMContentLoaded', () => {
    updateMapContainerOffset();
    initMap();
    window.addEventListener('resize', updateMapContainerOffset);
});
