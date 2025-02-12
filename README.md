# Sateliot Keeptrack

This project is a customized version of [keeptrack.space](https://github.com/thkruz/keeptrack.space/), an astrodynamics tool designed to make learning about orbital mechanics and satellite operations more accessible to non-engineers. The modifications focus on integrating specific functionalities for Sateliot satellites.

## Project Overview

This project extends the capabilities of the original keeptrack.space project by focusing on the Sateliot satellite constellation. It offers the different features for visualizing satellite orbits while incorporating customized elements specific to Sateliot's satellites.

### Key Modifications

- **Sateliot Satellites Integration**: The project tracks Sateliot's satellite constellation using NORAD IDs.
- **Optimized Data Fetching**: Modify the loading process for the "limiSats" feature to avoid unexpected behavior.
- **Sateliot Branding**: The Sateliot logo and other visual elements are included or modified in the interface for visual branding.
- **Clean Visualization**: Certain elements of the interface are hidden to maintain a clean visualization of the satellite orbits.
- **Custom Preset**: A new preset for Sateliot satellites is created and enforced on startup.
- **Sound Disabling**: Sounds in various parts of the interface are disabled to provide a more focused user experience.
- **Customized Search Results**: The search results interface is customized to provide a better user experience.
- **Customized 3D Model Loading**: Only the Sateliot OBJ model is loaded to optimize performance.
- **Offset Distance Modification**: The default value of offsetDistance in the ConeMesh class is modified
- **2D Visualization**: A 2D visualization of satellite orbits is included for a different perspective on the data.


## Getting Started

### Prerequisites

Ensure you have [Docker](https://www.docker.com/) installed if you plan to run the project within a container.

You also need:

- **Node.js** (v18 or higher)
- **npm** (included with Node.js)

### Installation

1. Clone this repository:
   ```bash
   git clone https://github.com/yourusername/sateliot-keeptrack.git
   cd sateliot-keeptrack
    ```

2. Install the dependencies:
   ```bash
   npm install
   ```

3. Build the project:
   ```bash
   npm run build
   ```

4. Start the application:
   ```bash
   npm start
   ```

### Development

To run the project in development mode:
```bash
npm run build:watch
```

In other terminal, start the application:
```bash
npm run start
```

This mode detects changes in the source files and automatically rebuilds the project.

### Runing with Docker

1. Build the Docker image:
   ```bash
   docker build -t sateliot-keeptrack .
   ```

2. Run the Docker container:
   ```bash
    docker run -p 8080:8080 sateliot-keeptrack
    ```

## Data Sources

The project fetches TLE data from Celestrak, but it only updates the local data if the file is older than 24 hours.

The following data sources are used:

* TLE Data: https://storage.keeptrack.space/data/tle.json
* TLE Debris Data: https://app.keeptrack.space/tle/TLEdebris.json
* Vimpel Data: https://storage.keeptrack.space/data/vimpel.json

## Credits

This project is based on the original keeptrack.space by Theodore Kruczek.

## License

KeepTrack.Space is licensed under the GNU Affero General Public License. This means you can freely use, modify, and distribute it, provided you adhere to the terms of the license. For more details, see the original full license in https://github.com/thkruz/keeptrack.space/blob/main/LICENSE.