# Sateliot Keeptrack

This project is a customized version of [keeptrack.space](https://github.com/thkruz/keeptrack.space/), an astrodynamics tool designed to make learning about orbital mechanics and satellite operations more accessible to non-engineers. The modifications focus on integrating specific functionalities for Sateliot satellites.

## Features

- Visualizes satellite orbits using real-time and historical TLE (Two-Line Elements) data.
- Fetches and updates TLE data from [Celestrak](https://celestrak.com/) based on the last file modification time (within 24 hours).
- Provides a user-friendly interface for tracking Sateliot satellites.

## Project Overview

This project extends the capabilities of the original keeptrack.space project by focusing on the Sateliot satellite constellation. It offers the same robust features for visualizing satellite orbits while incorporating customized elements specific to Sateliot's satellites.

### Key Modifications

- **Sateliot Satellites Integration**: The project tracks Sateliot's satellite constellation using NORAD IDs.
- **Optimized Data Fetching**: Implements logic to fetch TLE data only if the local data is older than 24 hours, reducing redundant API requests to Celestrak.
- **Sateliot Branding**: The Sateliot logo and other visual elements are included or modified in the interface for visual branding.

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