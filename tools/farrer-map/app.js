/**
 * Farrer Map Application
 * Interactive map with MapLibre and OpenFreeMap
 */

// Sydney CBD coordinates
const SYDNEY_CBD = {
    lng: 151.2093,
    lat: -33.8688,
    zoom: 13
};

// Example GeoJSON data for voting booths around Sydney
const boothsGeoJSON = {
    "type": "FeatureCollection",
    "features": [
        {
            "type": "Feature",
            "properties": {
                "name": "Sydney Town Hall",
                "address": "483 George St, Sydney NSW 2000",
                "type": "Voting Booth"
            },
            "geometry": {
                "type": "Point",
                "coordinates": [151.2073, -33.8737]
            }
        },
        {
            "type": "Feature",
            "properties": {
                "name": "Hyde Park Barracks",
                "address": "Queens Square, Macquarie St, Sydney NSW 2000",
                "type": "Voting Booth"
            },
            "geometry": {
                "type": "Point",
                "coordinates": [151.2115, -33.8688]
            }
        },
        {
            "type": "Feature",
            "properties": {
                "name": "Circular Quay Station",
                "address": "Alfred St, Sydney NSW 2000",
                "type": "Voting Booth"
            },
            "geometry": {
                "type": "Point",
                "coordinates": [151.2109, -33.8616]
            }
        },
        {
            "type": "Feature",
            "properties": {
                "name": "Royal Botanic Garden",
                "address": "Mrs Macquaries Rd, Sydney NSW 2000",
                "type": "Voting Booth"
            },
            "geometry": {
                "type": "Point",
                "coordinates": [151.2177, -33.8641]
            }
        },
        {
            "type": "Feature",
            "properties": {
                "name": "Darling Harbour",
                "address": "Darling Dr, Sydney NSW 2000",
                "type": "Voting Booth"
            },
            "geometry": {
                "type": "Point",
                "coordinates": [151.1987, -33.8722]
            }
        },
        {
            "type": "Feature",
            "properties": {
                "name": "Sydney Opera House",
                "address": "Bennelong Point, Sydney NSW 2000",
                "type": "Voting Booth"
            },
            "geometry": {
                "type": "Point",
                "coordinates": [151.2153, -33.8568]
            }
        },
        {
            "type": "Feature",
            "properties": {
                "name": "Central Station",
                "address": "Eddy Ave, Sydney NSW 2000",
                "type": "Voting Booth"
            },
            "geometry": {
                "type": "Point",
                "coordinates": [151.2073, -33.8830]
            }
        },
        {
            "type": "Feature",
            "properties": {
                "name": "University of Sydney",
                "address": "Eastern Ave, Camperdown NSW 2006",
                "type": "Voting Booth"
            },
            "geometry": {
                "type": "Point",
                "coordinates": [151.1873, -33.8886]
            }
        }
    ]
};

// Map instance
let map;
let boothsVisible = true;

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
        addBoothsLayer();
        updateStats();
    });
}

/**
 * Add booths layer to the map
 */
function addBoothsLayer() {
    // Add the GeoJSON source
    map.addSource('booths', {
        type: 'geojson',
        data: boothsGeoJSON
    });

    // Add a layer for the booth markers
    map.addLayer({
        id: 'booths-layer',
        type: 'circle',
        source: 'booths',
        paint: {
            'circle-radius': 8,
            'circle-color': '#6366f1',
            'circle-stroke-color': '#ffffff',
            'circle-stroke-width': 2
        }
    });

    // Add labels for the booths
    map.addLayer({
        id: 'booths-labels',
        type: 'symbol',
        source: 'booths',
        layout: {
            'text-field': ['get', 'name'],
            'text-size': 12,
            'text-offset': [0, 1.5],
            'text-anchor': 'top'
        },
        paint: {
            'text-color': '#ffffff',
            'text-halo-color': '#0f172a',
            'text-halo-width': 1.5
        }
    });

    // Add click event for popups
    map.on('click', 'booths-layer', (e) => {
        const coordinates = e.features[0].geometry.coordinates.slice();
        const properties = e.features[0].properties;

        // Create popup content
        const popupContent = `
            <div class="popup-title">${properties.name}</div>
            <div class="popup-details">
                <p><strong>Type:</strong> ${properties.type}</p>
                <p><strong>Address:</strong> ${properties.address}</p>
            </div>
        `;

        // Ensure that if the map is zoomed out such that multiple
        // copies of the feature are visible, the popup appears
        // over the copy being pointed to
        while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
            coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
        }

        new maplibregl.Popup()
            .setLngLat(coordinates)
            .setHTML(popupContent)
            .addTo(map);
    });

    // Change cursor on hover
    map.on('mouseenter', 'booths-layer', () => {
        map.getCanvas().style.cursor = 'pointer';
    });

    map.on('mouseleave', 'booths-layer', () => {
        map.getCanvas().style.cursor = '';
    });
}

/**
 * Reset map view to Sydney CBD
 */
function resetView() {
    map.flyTo({
        center: [SYDNEY_CBD.lng, SYDNEY_CBD.lat],
        zoom: SYDNEY_CBD.zoom,
        essential: true
    });
}

/**
 * Toggle booths visibility
 */
function toggleBooths() {
    boothsVisible = !boothsVisible;
    const visibility = boothsVisible ? 'visible' : 'none';
    
    map.setLayoutProperty('booths-layer', 'visibility', visibility);
    map.setLayoutProperty('booths-labels', 'visibility', visibility);
    
    // Update button state
    const toggleBtn = document.getElementById('toggle-booths');
    if (boothsVisible) {
        toggleBtn.classList.add('active');
    } else {
        toggleBtn.classList.remove('active');
    }
}

/**
 * Update statistics display
 */
function updateStats() {
    const totalBooths = boothsGeoJSON.features.length;
    document.getElementById('total-booths').textContent = totalBooths;
}

/**
 * Initialize the application
 */
document.addEventListener('DOMContentLoaded', () => {
    // Initialize map
    initMap();

    // Set up event listeners
    document.getElementById('reset-view').addEventListener('click', resetView);
    document.getElementById('toggle-booths').addEventListener('click', toggleBooths);
});
