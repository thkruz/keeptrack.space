// CONFIGURATION
var orbitPolylines = [];
var orbitDecorators = [];
var allMarkers = [];
var segmentOrbit = false;

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

// Satellite configuration
var sateliotSatellites = [];
const sateliotSatellitesDefault = [
    { norad: 60550, color: '#FF6B00' },
    { norad: 60534, color: '#00A7E1' },
    { norad: 60552, color: '#1D1D1B' },
    { norad: 60537, color: '#9D9D9C' }
];

// Function to load TLE data from a JSON file
async function getTLEData() {
    const response = await fetch('../tle/sateliot.json');
    const tleData = await response.json();
    return tleData.filter(satellite =>
        sateliotSatellitesDefault.some(sat => parseInt(satellite.TLE2.split(' ')[1]) === sat.norad)
    );
}

// Function to normalize longitude to ensure smooth progression
function normalizeLongitude(longitude, lastLongitude) {
    if (longitude - lastLongitude > 180) {
        longitude -= 360; // Adjust crossing the 180° E -> W
    } else if (longitude - lastLongitude < -180) {
        longitude += 360; // Adjust crossing the 180° W -> E
    }
    return longitude;
}

// Function to get the full orbit coordinates from the current time
function getOrbitCoordinates(tleLine1, tleLine2, timeArray) {
    const satrec = satellite.twoline2satrec(tleLine1, tleLine2);
    let lastLongitude = null;
    const orbitCoordinates = [];

    timeArray.forEach(time => {
        const positionAndVelocity = satellite.propagate(satrec, time);
        if (!positionAndVelocity.position) return;

        const gmst = satellite.gstime(time);
        const positionGd = satellite.eciToGeodetic(positionAndVelocity.position, gmst);
        let longitude = satellite.degreesLong(positionGd.longitude);
        const latitude = satellite.degreesLat(positionGd.latitude);

        if (lastLongitude !== null) {
            longitude = normalizeLongitude(longitude, lastLongitude);
        }
        lastLongitude = longitude;
        orbitCoordinates.push([latitude, longitude]);
    });

    return orbitCoordinates;
}

// Function to detect 180-degree meridian crossings and segment the orbit
function detectMeridianCross(coordinates) {
    const segments = [];
    let currentSegment = [];

    for (let i = 0; i < coordinates.length - 1; i++) {
        const [lat1, lon1] = coordinates[i];
        const [lat2, lon2] = coordinates[i + 1];

        currentSegment.push([lat1, lon1]);

        if (Math.abs(lon1 - lon2) > 180) {
            segments.push(currentSegment);
            currentSegment = [];
        }
    }

    currentSegment.push(coordinates[coordinates.length - 1]);
    segments.push(currentSegment);

    return segments;
}

// Function to draw the satellite orbit
function drawSatelliteOrbit(satellite, segmentOrbit) {
    const secondsInThePast = 45 * 60; // Orbit time in seconds
    const secondsInTheFuture = 90 * 60; // Orbit time in seconds
    const step = 10; // Time step in seconds
    const timeArray = Array.from({ length: secondsInThePast / step }, (_, i) =>
        new Date(new Date().getTime() - i * step * 1000)
    );

    const timeArrayFuture = Array.from({ length: secondsInTheFuture / step }, (_, i) =>
        new Date(new Date().getTime() + i * step * 1000)
    );

    // merge past and future time arrays
    timeArray.push(...timeArrayFuture);

    // order by time
    timeArray.sort((a, b) => a - b);

    const orbitCoordinates = getOrbitCoordinates(satellite.TLE1, satellite.TLE2, timeArray);
    const sateliteColor = sateliotSatellitesDefault.find(sat => parseInt(satellite.TLE2.split(' ')[1]) === sat.norad).color;

    if (segmentOrbit) {
        const segments = detectMeridianCross(orbitCoordinates);
        segments.forEach(segment => {
            const polyline = L.polyline(segment, { color: sateliteColor }).addTo(map);
            orbitPolylines.push(polyline);
        });
    } else {
        const polyline = L.polyline(orbitCoordinates, { color: sateliteColor }).addTo(map);
        orbitPolylines.push(polyline);
    }
}

// Main function to load and draw Sateliot satellites
async function loadSateliotSatellites() {
    const sateliotSatellites = await getTLEData();

    sateliotSatellites.forEach(satellite => {
        drawSatelliteOrbit(satellite, segmentOrbit);
        const currentPosition = getOrbitCoordinates(satellite.TLE1, satellite.TLE2, [new Date()])[0];
        const marker = L.marker(currentPosition, { icon: satelliteIcon }).addTo(map);
        allMarkers.push(marker);
    });

    setInterval(() => {
        clearOrbits();
        sateliotSatellites.forEach(satellite => drawSatelliteOrbit(satellite, segmentOrbit));
    }, 300000);
}

function clearOrbits() {
    orbitPolylines.forEach(polyline => map.removeLayer(polyline));
    orbitPolylines = [];
}

// Load the Sateliot satellites
loadSateliotSatellites();
