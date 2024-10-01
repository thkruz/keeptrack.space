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
function getOrbitCoordinatesUpToNow(tleLine1, tleLine2, secondsInThePast) {
    if (tleLine1 === undefined || tleLine2 === undefined) {
        console.log("TLE lines are undefined");
        return;
    }
    const satrec = satellite.twoline2satrec(tleLine1, tleLine2);
    const positions = [];

    // Simulate the full orbit up to the current time
    const now = new Date();  // Current time
    // const secondsInThePast = 45 * 60;  // Orbit time in seconds (a typical full orbit is 90 minutes. Half, 45 minutes)

    // Generate a point every 10 seconds
    const step = 10;  // 10 seconds per point
    var lastLongitude = 0;
    var orbitCount = 0;

    for (let i = 0; i <= secondsInThePast; i += step) {
        var time = new Date(now.getTime() - i * 1000);  // Go back in seconds
        var positionAndVelocity = satellite.propagate(satrec, time);
        var positionGd = satellite.eciToGeodetic(positionAndVelocity.position, satellite.gstime(time));
        var longitude = satellite.degreesLong(positionGd.longitude);
        var latitude = satellite.degreesLat(positionGd.latitude);

        // If we cross the 180-degree meridian (from -180 to +180 or vice versa), increment the orbit counter
        if (i > 0 && Math.abs(longitude - lastLongitude) > 180) {
            orbitCount++;
        }

        lastLongitude = longitude;

        // Slide longitudes in multiples of 360 degrees according to the orbit counter
        longitude += orbitCount * 360;

        positions.push([latitude, longitude]);
    }

    return positions.reverse();  // Reverse to have the most recent position at the end
}

// Function to get the full orbit coordinates from the current time
function getOrbitCoordinatesFromNow(tleLine1, tleLine2, secondsInTheFuture) {
    if (tleLine1 === undefined || tleLine2 === undefined) {
        console.log("TLE lines are undefined");
        return;
    }
    var positions = [];
    var satrec = satellite.twoline2satrec(tleLine1, tleLine2);
    var now = new Date();

    var lastLongitude = 0;
    var orbitCount = 0;  // Contador para controlar cuándo se completa una órbita

    // ** Cambiar los pasos a cada 10 segundos en lugar de 1 minuto**
    const step = 10;  // 10 seconds per point

    for (let i = 0; i <= secondsInTheFuture; i += step) {
        var time = new Date(now.getTime() + i * 1000);  // Avanzar en intervalos de 10 segundos
        var positionAndVelocity = satellite.propagate(satrec, time);
        var positionGd = satellite.eciToGeodetic(positionAndVelocity.position, satellite.gstime(time));
        var longitude = satellite.degreesLong(positionGd.longitude);
        var latitude = satellite.degreesLat(positionGd.latitude);

        // If we cross the 180-degree meridian (from -180 to +180 or vice versa), increment the orbit counter
        if (i > 0 && Math.abs(longitude - lastLongitude) > 180) {
            orbitCount++;
        }

        lastLongitude = longitude;

        // slide longitudes in multiples of 360 degrees according to the orbit counter
        longitude -= orbitCount * 360;

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

// Function to clear the old orbits
function clearOrbits() {
    // Remove old orbit polylines
    orbitPolylines.forEach(polyline => {
        map.removeLayer(polyline);
    });
    orbitPolylines = [];  // Clear the list after removing

    // Remove old decorators
    orbitDecorators.forEach(decorator => {
        map.removeLayer(decorator);
    });
    orbitDecorators = [];  // Clear the list after removing
}

// Function to draw the full orbit up to the current time
function drawSatelliteOrbit(satellite, orbitPolylines, segmentOrbit) {

    // Get the full orbit up to the current time
    const secondsInThePast = 45 * 60;  // Orbit time in seconds (a typical full orbit is 90 minutes. Half, 45 minutes)
    const secondsInTheFuture = 90 * 60;  // Orbit time in seconds (a typical full orbit is 90 minutes)
    // seconds in the future to draw the orbit for 24 hours
    // const secondsInTheFuture = 24 * 60 * 60;

    const orbitCoordinatesPast = getOrbitCoordinatesUpToNow(satellite.TLE1, satellite.TLE2, secondsInThePast);
    const orbitCoordinatesFuture = getOrbitCoordinatesFromNow(satellite.TLE1, satellite.TLE2, secondsInTheFuture);
    if (orbitCoordinatesPast === undefined || orbitCoordinatesFuture === undefined) {
        console.log("Error getting orbit coordinates");
        return;
    }
    const orbitCoordinates = orbitCoordinatesPast.concat(orbitCoordinatesFuture);

    // Get satellite color
    const satelite_color = sateliotSatellites.find(sat => parseInt(satellite.TLE2.split(' ')[1]) === sat.norad).color;

    if (segmentOrbit) {
        // If segmentation is enabled, detect 180-degree meridian crossing and segment the orbit
        const segments = detectMeridianCross(orbitCoordinates);
        // Draw each segment of the orbit
        segments.forEach(segment => {
            polyline = L.polyline(segment, { color: satelite_color }).addTo(map);
            orbitPolylines.push(polyline);
        });
    } else {
        // If segmentation is disabled, draw the orbit as a continuous line
        polyline = L.polyline(orbitCoordinates, { color: satelite_color }).addTo(map);
        orbitPolylines.push(polyline);
    }

    // Add arrows or symbols to show direction of movement
    const decorator = L.polylineDecorator(polyline, {
        patterns: [
            {
                offset: 25, // Starting point
                repeat: 200, // Space between arrows
                symbol: L.Symbol.arrowHead({
                    pixelSize: 10, // Size of the arrow
                    polygon: false,
                    pathOptions: { stroke: true, color: satelite_color, weight: 2 }
                })
            }
        ]
    }).addTo(map);

    orbitDecorators.push(decorator);  // Store the decorator to remove later

}

function updateSatellitePosition(satellite, marker) {
    const currentPosition = getCurrentPosition(satellite.TLE1, satellite.TLE2);
    marker.setLatLng(currentPosition);
}

// Function to add a marker to the map
function addMarker(marker) {
    allMarkers.push(marker);  // Almacenar el marcador en la lista
}

// Function to remove all markers from the map
function removeAllMarkers() {
    allMarkers.forEach(marker => {
        map.removeLayer(marker);  // Eliminar cada marcador del mapa
    });
    allMarkers = [];  // Vaciar la lista después de eliminar los marcadores
}

// Main function to load and draw Sateliot satellites
async function loadSateliotSatellites() {
    const sateliotSatellites = await getTLEData();

    // Draw the orbits on load the application
    sateliotSatellites.forEach(satellite => {
        drawSatelliteOrbit(satellite, orbitPolylines, segmentOrbit);

        var currentPosition = getCurrentPosition(satellite.TLE1, satellite.TLE2);
        var marker = L.marker(currentPosition, { icon: satelliteIcon }).addTo(map).bindPopup(`<b>${satellite.name}</b>`);
        addMarker(marker);
        updateSatellitePosition(satellite, marker);

    });

    // Update satellite position periodically
    setInterval(() => {
        removeAllMarkers();
        sateliotSatellites.forEach(satellite => {
            var currentPosition = getCurrentPosition(satellite.TLE1, satellite.TLE2);
            var marker = L.marker(currentPosition, { icon: satelliteIcon }).addTo(map).bindPopup(`<b>${satellite.name}</b>`);
            addMarker(marker);
            updateSatellitePosition(satellite, marker);
        });
    }, 1000);


    // Update the orbits periodically
    setInterval(() => {
        clearOrbits();
        sateliotSatellites.forEach(satellite => {
            drawSatelliteOrbit(satellite, orbitPolylines, segmentOrbit);
        });
    }, 300000); // Update every 300000ms (5 minutes)
    // }, 5000); // Update every 5000ms (5 seconds)

}

setInterval(() => {
    terminator.setTime(new Date(Date.now())); // Update the terminator with the current time UTC
    terminator.addTo(map);
}, 60000); // Update terminator every 60000ms (1 minute)

// Load the Sateliot satellites
loadSateliotSatellites();