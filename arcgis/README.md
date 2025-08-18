# ArcGIS Prototype

This is a minimal ArcGIS JS globe rendering satellites from `public/tle/TLE.txt` using satellite.js for propagation and ArcGIS 3D SceneView for rendering.

How to run
- Serve the project root or `public/` via any static server.
- Open `public/arcgis/index.html` (references assets in `public/`).
- Or open `arcgis/index.html` (standalone) and adjust `TLE_URL` in `arcgis/app.js` if needed.

Notes
- Camera pan/tilt/zoom via default ArcGIS controls.
- Positions update every second; click a satellite and use the popup action to draw a 24h track.
- Barebones by design to validate ArcGIS performance and animation.