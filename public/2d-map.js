// Configurar el mapa de Leaflet
const map = L.map('map').setView([0, 0], 2); // Coordenadas iniciales [lat, lon] y nivel de zoom 2

// Capas de mapa base
const openStreetMap = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
});

const satelliteMap = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
    attribution: 'Map data: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> contributors'
});

const esriSatellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
});

// Añadir el mapa base predeterminado
openStreetMap.addTo(map);

// Crear un control de capas para permitir la selección del mapa base
const baseMaps = {
    "OpenStreetMap": openStreetMap,
    "Satellite Map": satelliteMap,
    "Esri Satellite": esriSatellite
};

// Añadir el control de capas al mapa
L.control.layers(baseMaps).addTo(map);

// Añade la capa del terminador solar 
L.terminator().addTo(map);


// Definir el icono personalizado del satélite
const satelliteIcon = L.icon({
    iconUrl: 'img/satellite-icon.png',  // Ruta a la imagen del satélite
    iconSize: [32, 32],  // Tamaño del icono (ajusta según sea necesario)
    iconAnchor: [16, 16],  // El punto en el icono que corresponderá a la posición del satélite (centro en este caso)
    popupAnchor: [0, -16]  // Donde aparecerá el popup en relación con el icono
});

// Lista de NORAD de los satélites de Sateliot
const sateliotSatellites = [
    { norad: 60550, color: '#FF6B00' },
    { norad: 60534, color: '#00A7E1' },
    { norad: 60552, color: '#1D1D1B' },
    { norad: 60537, color: '#9D9D9C' }
];

// Función para cargar los TLE desde el archivo JSON
async function getTLEData() {
    const response = await fetch('https://storage.keeptrack.space/data/tle.json');
    const tleData = await response.json();

    // Filtrar los satélites que tienen los NORAD que estamos buscando
    return tleData.filter(satellite =>
        sateliotSatellites.some(sat => parseInt(satellite.TLE2.split(' ')[1]) === sat.norad)
    );
}

// Función para detectar cruces del meridiano de 180 grados
function detectMeridianCross(coordinates) {
    const segments = [];
    let currentSegment = [];

    for (let i = 0; i < coordinates.length - 1; i++) {
        const [lat1, lon1] = coordinates[i];
        const [lat2, lon2] = coordinates[i + 1];

        // Añadir el punto actual al segmento
        currentSegment.push([lat1, lon1]);

        // Detectar cruce del meridiano de 180 grados
        if (Math.abs(lon1 - lon2) > 180) {
            // Finalizar el segmento actual
            segments.push(currentSegment);
            // Iniciar un nuevo segmento
            currentSegment = [];
        }
    }

    // Añadir el último segmento si no está vacío
    if (currentSegment.length > 0) {
        currentSegment.push(coordinates[coordinates.length - 1]);
        segments.push(currentSegment);
    }

    return segments;
}

// Función para obtener las coordenadas de la órbita completa hasta el tiempo actual
function getOrbitCoordinatesUpToNow(tleLine1, tleLine2) {
    const satrec = satellite.twoline2satrec(tleLine1, tleLine2);
    const positions = [];

    // Simular la órbita completa hasta el tiempo actual
    const now = new Date();  // Momento actual
    const secondsInThePast = 45 * 60;  // Tiempo de la órbita en segundos (una órbita completa típica es 90 minutos. La mitad, 45 minutos)

    // Generar un punto cada 10 segundos
    const step = 10;  // 10 segundos por punto

    for (let i = 0; i <= secondsInThePast; i += step) {
        const time = new Date(now.getTime() - i * 1000);  // Retroceder en segundos
        const positionAndVelocity = satellite.propagate(satrec, time);
        const positionGd = satellite.eciToGeodetic(positionAndVelocity.position, satellite.gstime(time));
        const longitude = satellite.degreesLong(positionGd.longitude);
        const latitude = satellite.degreesLat(positionGd.latitude);
        positions.push([latitude, longitude]);
    }

    return positions.reverse();  // Invertir para tener la posición más reciente al final
}

// Función para obtener las coordenadas de la órbita desde el tiempo actual
function getOrbitCoordinatesFromNow(tleLine1, tleLine2) {
    const satrec = satellite.twoline2satrec(tleLine1, tleLine2);
    const positions = [];

    // Simular la órbita completa desde el tiempo actual
    const now = new Date();  // Momento actual
    const secondsInTheFuture = 90 * 60;  // Tiempo de la órbita en segundos (una órbita completa típica es 90 minutos)

    // Generar un punto cada 10 segundos
    const step = 10;  // 10 segundos por punto

    for (let i = 0; i <= secondsInTheFuture; i += step) {
        const time = new Date(now.getTime() + i * 1000);  // Avanzar en segundos
        const positionAndVelocity = satellite.propagate(satrec, time);
        const positionGd = satellite.eciToGeodetic(positionAndVelocity.position, satellite.gstime(time));
        const longitude = satellite.degreesLong(positionGd.longitude);
        const latitude = satellite.degreesLat(positionGd.latitude);
        positions.push([latitude, longitude]);
    }

    return positions;
}

// Función para obtener la posición actual de un satélite
function getCurrentPosition(tleLine1, tleLine2) {
    const satrec = satellite.twoline2satrec(tleLine1, tleLine2);
    const time = new Date();
    const positionAndVelocity = satellite.propagate(satrec, time);
    const positionGd = satellite.eciToGeodetic(positionAndVelocity.position, satellite.gstime(time));
    const longitude = satellite.degreesLong(positionGd.longitude);
    const latitude = satellite.degreesLat(positionGd.latitude);
    return [latitude, longitude];
}

// Función para dibujar la órbita completa hasta el momento actual
function drawSatelliteOrbit(satellite, orbitPolylines, marker) {
    // Obtener la órbita completa hasta el momento actual
    const orbitCoordinatesPast = getOrbitCoordinatesUpToNow(satellite.TLE1, satellite.TLE2);
    const orbitCoordinatesFuture = getOrbitCoordinatesFromNow(satellite.TLE1, satellite.TLE2);
    const orbitCoordinates = orbitCoordinatesPast.concat(orbitCoordinatesFuture);

    // Detectar si el satélite cruza el meridiano de 180 grados
    const segments = detectMeridianCross(orbitCoordinates);

    // Limpiar las líneas previas
    orbitPolylines.forEach(polyline => polyline.remove());

    satelite_color = sateliotSatellites.find(sat => parseInt(satellite.TLE2.split(' ')[1]) === sat.norad).color;


    // Dibujar cada segmento de la órbita
    segments.forEach(segment => {
        const polyline = L.polyline(segment, { color: satelite_color }).addTo(map);
        orbitPolylines.push(polyline);
    });

    // Actualizar la posición actual del satélite
    const currentPosition = getCurrentPosition(satellite.TLE1, satellite.TLE2);
    marker.setLatLng(currentPosition);
}

// Función principal para cargar y dibujar los satélites de Sateliot
async function loadSateliotSatellites() {
    const sateliotSatellites = await getTLEData();

    // Para cada satélite, crear la órbita y actualizar la posición periódicamente
    sateliotSatellites.forEach(satellite => {
        // Lista para almacenar las líneas de la órbita
        const orbitPolylines = [];

        // Crear un marcador para la posición actual del satélite
        const currentPosition = getCurrentPosition(satellite.TLE1, satellite.TLE2);
        // const marker = L.marker(currentPosition).addTo(map).bindPopup(`<b>${satellite.name}</b>`);
        const marker = L.marker(currentPosition, { icon: satelliteIcon }).addTo(map).bindPopup(`<b>${satellite.name}</b>`);


        // Actualizar la posición del satélite cada segundo y dibujar la órbita completa hasta el momento actual
        setInterval(() => {
            drawSatelliteOrbit(satellite, orbitPolylines, marker);
        }, 1000); // Actualización cada 1000ms (1 segundo)
    });
}

setInterval(() => {
    terminator.setTime(new Date());
    terminator.addTo(map);
}, 60000);

// Llamar a la función principal para cargar y dibujar los satélites de Sateliot
loadSateliotSatellites();


