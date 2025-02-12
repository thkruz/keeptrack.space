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

var sateliotSatellites = [];

// List of NORAD IDs for Sateliot satellites
const sateliotSatellitesDefault = [
    { norad: 60550, color: '#FF6B00' },
    { norad: 60534, color: '#00A7E1' },
    { norad: 60552, color: '#1D1D1B' },
    { norad: 60537, color: '#9D9D9C' }
];

// norad phaseA: 99005,99006,99007,99008,99009,99010,99011,99012,99013,99014,99015,99016,99017,99018,99019,99020
const sateliotSatellitesPhaseA = [
    { norad: 99005, color: '#FF6B00' },
    { norad: 99006, color: '#00A7E1' },
    { norad: 99007, color: '#1D1D1B' },
    { norad: 99008, color: '#9D9D9C' },
    { norad: 99009, color: '#FFAA00' },
    { norad: 99010, color: '#007BA7' },
    { norad: 99011, color: '#333333' },
    { norad: 99012, color: '#B4B4B4' },
    { norad: 99013, color: '#FF4500' },
    { norad: 99014, color: '#0082C8' },
    { norad: 99015, color: '#2F4F4F' },
    { norad: 99016, color: '#C0C0C0' },
    { norad: 99017, color: '#FF6347' },
    { norad: 99018, color: '#40E0D0' },
    { norad: 99019, color: '#4B0082' },
    { norad: 99020, color: '#A9A9A9' }
];


// norad phaseB: 99001,99002,99003,99004,99005,99006,99007,99008,99009,99010,99011,99012,99013,99014,99015,99016,99017,99018,99019,99020,99021,99022,99023,99024,99025,99026,99027,99028,99029,99030,99031,99032,99033,99034,99035,99036,99037,99038,99039,99040,99041,99042,99043,99044,99045,99046,99047,99048,99049,99050,99051,99052,99053,99054,99055,99056,99057,99058,99059,99060,99061,99062,99063,99064
const sateliotSatellitesPhaseB = [
    { norad: 99001, color: '#FF6B00' },
    { norad: 99002, color: '#00A7E1' },
    { norad: 99003, color: '#1D1D1B' },
    { norad: 99004, color: '#9D9D9C' },
    { norad: 99005, color: '#FFAA00' },
    { norad: 99006, color: '#007BA7' },
    { norad: 99007, color: '#333333' },
    { norad: 99008, color: '#B4B4B4' },
    { norad: 99009, color: '#FF4500' },
    { norad: 99010, color: '#0082C8' },
    { norad: 99011, color: '#2F4F4F' },
    { norad: 99012, color: '#C0C0C0' },
    { norad: 99013, color: '#FF6347' },
    { norad: 99014, color: '#40E0D0' },
    { norad: 99015, color: '#4B0082' },
    { norad: 99016, color: '#A9A9A9' },
    { norad: 99017, color: '#FFD700' },
    { norad: 99018, color: '#7FFF00' },
    { norad: 99019, color: '#FF1493' },
    { norad: 99020, color: '#8A2BE2' },
    { norad: 99021, color: '#00FF7F' },
    { norad: 99022, color: '#6495ED' },
    { norad: 99023, color: '#DC143C' },
    { norad: 99024, color: '#FFB6C1' },
    { norad: 99025, color: '#4682B4' },
    { norad: 99026, color: '#00CED1' },
    { norad: 99027, color: '#32CD32' },
    { norad: 99028, color: '#8B0000' },
    { norad: 99029, color: '#FFA07A' },
    { norad: 99030, color: '#20B2AA' },
    { norad: 99031, color: '#556B2F' },
    { norad: 99032, color: '#DA70D6' },
    { norad: 99033, color: '#B22222' },
    { norad: 99034, color: '#9ACD32' },
    { norad: 99035, color: '#5F9EA0' },
    { norad: 99036, color: '#7B68EE' },
    { norad: 99037, color: '#48D1CC' },
    { norad: 99038, color: '#F08080' },
    { norad: 99039, color: '#F0E68C' },
    { norad: 99040, color: '#FFDAB9' },
    { norad: 99041, color: '#8B4513' },
    { norad: 99042, color: '#D2691E' },
    { norad: 99043, color: '#FFE4C4' },
    { norad: 99044, color: '#00FA9A' },
    { norad: 99045, color: '#ADFF2F' },
    { norad: 99046, color: '#FF7F50' },
    { norad: 99047, color: '#FF69B4' },
    { norad: 99048, color: '#DB7093' },
    { norad: 99049, color: '#E9967A' },
    { norad: 99050, color: '#FF00FF' },
    { norad: 99051, color: '#800080' },
    { norad: 99052, color: '#BA55D3' },
    { norad: 99053, color: '#9400D3' },
    { norad: 99054, color: '#9932CC' },
    { norad: 99055, color: '#8A2BE2' },
    { norad: 99056, color: '#6A5ACD' },
    { norad: 99057, color: '#4B0082' },
    { norad: 99058, color: '#483D8B' },
    { norad: 99059, color: '#2E8B57' },
    { norad: 99060, color: '#66CDAA' },
    { norad: 99061, color: '#98FB98' },
    { norad: 99062, color: '#7CFC00' },
    { norad: 99063, color: '#00FF00' },
    { norad: 99064, color: '#32CD32' }
];



// Function to load TLE data from a JSON file
async function getTLEData() {

    let response = null;
    // get URL parameters
    const urlParams = new URLSearchParams(window.location.search);

    // show url parameters
    console.log('params', urlParams);

    if (urlParams.has('preset') && urlParams.get('preset') === 'phaseA') {
        console.log('phaseA');
        response = await fetch('../tle/phaseA.json');
        sateliotSatellites = sateliotSatellitesPhaseA;
    } else if (urlParams.has('preset') && urlParams.get('preset') === 'phaseB') {
        console.log('phaseB');
        response = await fetch('../tle/phaseB.json');
        sateliotSatellites = sateliotSatellitesPhaseB;
    } else {
        console.log('default');
        // response = await fetch('https://storage.keeptrack.space/data/tle.json');
        response = await fetch('../tle/sateliot.json');
        sateliotSatellites = sateliotSatellitesDefault;
    }

    const tleData = await response.json();

    // Filter the satellites that have the NORAD IDs we are looking for
    return tleData.filter(satellite =>
        sateliotSatellites.some(sat => parseInt(satellite.TLE2.split(' ')[1]) === sat.norad)
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

// Function to get the full orbit coordinates from the current time
function getOrbitCoordinates(tleLine1, tleLine2, time) {
    if (tleLine1 === undefined || tleLine2 === undefined) {
        console.log("TLE lines are undefined");
        return;
    }
    var satrec = satellite.twoline2satrec(tleLine1, tleLine2);

    var lastLongitude = 0;
    var orbitCount = 0;  // Counter to control when an orbit is completed

    const inclination = satrec.inclo; // Inclination in degrees
    const isRetrograde = inclination > 90;
    if (isRetrograde) {
        console.log("Retrograde orbit");
    }

    var positionAndVelocity = satellite.propagate(satrec, time);
    if (!positionAndVelocity.position) {
        console.error("Invalid satellite position at time:", time);
        return
    }
    const gmst = satellite.gstime(time);
    const positionGd = satellite.eciToGeodetic(positionAndVelocity.position, gmst);


    let longitude = satellite.degreesLong(positionGd.longitude);
    const latitude = satellite.degreesLat(positionGd.latitude);

    if (lastLongitude !== null && Math.abs(longitude - lastLongitude) > 180) {
        orbitCount++; // Increment for prograde orbit
    }

    lastLongitude = longitude;

    return [latitude, longitude];
}


// Function to get the current position of a satellite
function getCurrentPosition(tleLine1, tleLine2) {
    const satrec = satellite.twoline2satrec(tleLine1, tleLine2);
    const time = new Date();
    const positionAndVelocity = satellite.propagate(satrec, time);
    const positionGd = satellite.eciToGeodetic(positionAndVelocity.position, satellite.gstime(time));
    let longitude = satellite.degreesLong(positionGd.longitude);
    let latitude = satellite.degreesLat(positionGd.latitude);

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

    const timeArray = Array.from({ length: secondsInThePast / step }, (_, i) =>
        new Date(new Date().getTime() - i * step * 1000)
    );
    // for (let i = 0; i <= secondsInTheFuture; i += step) {
    //     var time = new Date(new Date().getTime() + i * 1000);
    //     timeArray.push(time);
    // }


    // const orbitCoordinatesPast = getOrbitCoordinatesUpToNow(satellite.TLE1, satellite.TLE2, timeArray);
    // const orbitCoordinatesFuture = getOrbitCoordinatesFromNow(satellite.TLE1, satellite.TLE2, secondsInTheFuture);
    // if (orbitCoordinatesPast === undefined || orbitCoordinatesFuture === undefined) {
    //     console.log("Error getting orbit coordinates");
    //     return;
    // }
    // const orbitCoordinates = orbitCoordinatesPast.concat(orbitCoordinatesFuture);
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
    const coordinates = getOrbitCoordinates(satellite.TLE1, satellite.TLE2, new Date());
    // const currentPosition = getCurrentPosition(satellite.TLE1, satellite.TLE2);
    // marker.setLatLng(currentPosition);
    marker.setLatLng(coordinates);
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