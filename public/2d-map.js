// Set up the Leaflet map
const map = L.map('map').setView([0, 0], 2); // Initial coordinates [lat, lon] and zoom level 2

// Base map layers
const openStreetMap = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
});

const satelliteMap = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
    attribution: 'Map data: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> contributors'
});

const esriSatellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
});

// Add the default base map
openStreetMap.addTo(map);

// Create a layer control to allow base map selection
const baseMaps = {
    "OpenStreetMap": openStreetMap,
    "Satellite Map": satelliteMap,
    "Esri Satellite": esriSatellite
};

// Add the layer control to the map
L.control.layers(baseMaps).addTo(map);

// Add the solar terminator layer
L.terminator().addTo(map);

// Define the custom satellite icon
const satelliteIcon = L.icon({
    iconUrl: 'img/satellite-icon.png',  // Path to the satellite image
    iconSize: [32, 32],  // Icon size (adjust as needed)
    iconAnchor: [16, 16],  // The point on the icon that will correspond to the satellite's position (center in this case)
    popupAnchor: [0, -16]  // Where the popup will appear relative to the icon
});

// List of NORAD IDs for Sateliot satellites
const sateliotSatellites = [
    { norad: 60550, color: '#FF6B00' },
    { norad: 60534, color: '#00A7E1' },
    { norad: 60552, color: '#1D1D1B' },
    { norad: 60537, color: '#9D9D9C' }
];

// Function to load TLE data from a JSON file
async function getTLEData() {
    const response = await fetch('https://storage.keeptrack.space/data/tle.json');
    const tleData = await response.json();

    // Filter the satellites that have the NORAD IDs we are looking for
    return tleData.filter(satellite =>
        sateliotSatellites.some(sat => parseInt(satellite.TLE2.split(' ')[1]) === sat.norad)
    );
}

// Function to detect 180-degree meridian crossings
function detectMeridianCross(coordinates) {
    const segments = [];
    let currentSegment = [];

    for (let i = 0; i < coordinates.length - 1; i++) {
        const [lat1, lon1] = coordinates[i];
        const [lat2, lon2] = coordinates[i + 1];

        // Add the current point to the segment
        currentSegment.push([lat1, lon1]);

        // Detect 180-degree meridian crossing
        if (Math.abs(lon1 - lon2) > 180) {
            // End the current segment
            segments.push(currentSegment);
            // Start a new segment
            currentSegment = [];
        }
    }

    // Add the last segment if it's not empty
    if (currentSegment.length > 0) {
        currentSegment.push(coordinates[coordinates.length - 1]);
        segments.push(currentSegment);
    }

    return segments;
}

// Function to get the full orbit coordinates up to the current time
function getOrbitCoordinatesUpToNow(tleLine1, tleLine2) {
    const satrec = satellite.twoline2satrec(tleLine1, tleLine2);
    const positions = [];

    // Simulate the full orbit up to the current time
    const now = new Date();  // Current time
    const secondsInThePast = 45 * 60;  // Orbit time in seconds (a typical full orbit is 90 minutes. Half, 45 minutes)

    // Generate a point every 10 seconds
    const step = 10;  // 10 seconds per point

    for (let i = 0; i <= secondsInThePast; i += step) {
        const time = new Date(now.getTime() - i * 1000);  // Go back in seconds
        const positionAndVelocity = satellite.propagate(satrec, time);
        const positionGd = satellite.eciToGeodetic(positionAndVelocity.position, satellite.gstime(time));
        const longitude = satellite.degreesLong(positionGd.longitude);
        const latitude = satellite.degreesLat(positionGd.latitude);
        positions.push([latitude, longitude]);
    }

    return positions.reverse();  // Reverse to have the most recent position at the end
}

// Function to get the orbit coordinates from the current time
function getOrbitCoordinatesFromNow(tleLine1, tleLine2) {
    const satrec = satellite.twoline2satrec(tleLine1, tleLine2);
    const positions = [];

    // Simulate the full orbit from the current time
    const now = new Date();  // Current time
    const secondsInTheFuture = 90 * 60;  // Orbit time in seconds (a typical full orbit is 90 minutes)

    // Generate a point every 10 seconds
    const step = 10;  // 10 seconds per point

    for (let i = 0; i <= secondsInTheFuture; i += step) {
        const time = new Date(now.getTime() + i * 1000);  // Go forward in seconds
        const positionAndVelocity = satellite.propagate(satrec, time);
        const positionGd = satellite.eciToGeodetic(positionAndVelocity.position, satellite.gstime(time));
        const longitude = satellite.degreesLong(positionGd.longitude);
        const latitude = satellite.degreesLat(positionGd.latitude);
        positions.push([latitude, longitude]);
    }

    return positions;
}

// Function to get the current position of a satellite
function getCurrentPosition(tleLine1, tleLine2) {
    const satrec = satellite.twoline2satrec(tleLine1, tleLine2);
    const time = new Date();
    const positionAndVelocity = satellite.propagate(satrec, time);
    const positionGd = satellite.eciToGeodetic(positionAndVelocity.position, satellite.gstime(time));
    const longitude = satellite.degreesLong(positionGd.longitude);
    const latitude = satellite.degreesLat(positionGd.latitude);
    return [latitude, longitude];
}

// Function to draw the full orbit up to the current time
function drawSatelliteOrbit(satellite, orbitPolylines, marker) {
    // Get the full orbit up to the current time
    const orbitCoordinatesPast = getOrbitCoordinatesUpToNow(satellite.TLE1, satellite.TLE2);
    const orbitCoordinatesFuture = getOrbitCoordinatesFromNow(satellite.TLE1, satellite.TLE2);
    const orbitCoordinates = orbitCoordinatesPast.concat(orbitCoordinatesFuture);

    // Detect if the satellite crosses the 180-degree meridian
    const segments = detectMeridianCross(orbitCoordinates);

    // Clear previous orbit lines
    orbitPolylines.forEach(polyline => polyline.remove());

    satelite_color = sateliotSatellites.find(sat => parseInt(satellite.TLE2.split(' ')[1]) === sat.norad).color;

    // Draw each orbit segment
    segments.forEach(segment => {
        const polyline = L.polyline(segment, { color: satelite_color }).addTo(map);
        orbitPolylines.push(polyline);
    });

    // Update the satellite's current position
    const currentPosition = getCurrentPosition(satellite.TLE1, satellite.TLE2);
    marker.setLatLng(currentPosition);
}

// Main function to load and draw Sateliot satellites
async function loadSateliotSatellites() {
    const sateliotSatellites = await getTLEData();

    // For each satellite, create the orbit and periodically update the position
    sateliotSatellites.forEach(satellite => {
        // List to store the orbit lines
        const orbitPolylines = [];

        // Create a marker for the satellite's current position
        const currentPosition = getCurrentPosition(satellite.TLE1, satellite.TLE2);
        // const marker = L.marker(currentPosition).addTo(map).bindPopup(`<b>${satellite.name}</b>`);
        const marker = L.marker(currentPosition, { icon: satelliteIcon }).addTo(map).bindPopup(`<b>${satellite.name}</b>`);

        // Update the satellite's position every second and draw the full orbit up to the current time
        setInterval(() => {
            drawSatelliteOrbit(satellite, orbitPolylines, marker);
        }, 1000); // Update every 1000ms (1 second)
    });
}

setInterval(() => {
    terminator.setTime(new Date());
    terminator.addTo(map);
}, 60000);

// Load the Sateliot satellites
loadSateliotSatellites();