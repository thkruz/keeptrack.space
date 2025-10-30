# Regression Testing Guide for KeepTrack.space

## Introduction

KeepTrack.space is an open-source space exploration tool designed for visualizing satellites and space debris. It allows users to simulate space debris breakups, visualize debris patterns, search through a catalog of satellites, and much more.

## Testing Objectives

The primary objective of regression testing is to ensure that recent changes have not adversely affected existing functionalities or performance of the application.

## Scope of Testing

- **Complete End-to-End Testing**: This includes testing all major functionalities of the application such as searching the catalog, simulating breakups, launching satellites, and visualizing debris patterns.
- **Performance Checks**: Ensure the application still loads in under 2 seconds and maintains a smooth performance at 60 frames per second during simulations.

## Testing Environment

- **Local Development Setup**: Tests will be conducted in the development environment hosted locally.
- **Tools Required**: Visual Studio Code for code edits and debugging, and the Brave browser for interacting with the application.

## Test Cases

### Setup and Initial Checks

- **Launch Application**: Ensure the application loads correctly and reaches the main interface within the expected time.
- **Database Integrity**: Check that the database loads correctly, and all satellite and debris data are accessible.

### Functionality Tests

- **Search Functionality**:
  - Search for various satellites using name, NORAD ID, and international designator to ensure accuracy and responsiveness.
  - Test sorting and filtering capabilities in the search results.
- **Simulation Tests**:
  - Simulate a debris breakup and verify the debris spreads as expected.
  - Simulate a satellite launch and observe the visualization from different points on Earth.
  - Test the responsiveness of the application when adjusting simulation parameters.
- **Sensor Data Visualization**:
  - Select different sensors and verify the output against expected results.
  - Test the application's response to switching between multiple sensors rapidly.
- **Debris Visualization**:
  - Check various debris patterns and ensure they update and display correctly over time.
  - Test the performance of the visualization under different scenarios (e.g., high debris density).
- **User Interface Consistency**:
  - Ensure that all UI elements are consistent across different pages.
  - Test responsiveness and layout adjustments on different browser sizes.
- **Presets**:
  - Check that <http://localhost:5544?preset=debris> works.
  - Check that <http://localhost:5544?preset=starlink> works.
  - Check that <http://localhost:5544?preset=ops-center> works.
  - Check that <http://localhost:5544?preset=education> works.
  - Check that <http://localhost:5544?preset=epfl> works.
  - Check that <http://localhost:5544?preset=outreach> works.
  - Check that <http://localhost:5544?preset=million-year> works.
  - Check that <http://localhost:5544?preset=million-year2> works.
  - Check that <http://localhost:5544?preset=altitudes> works.
  - Check that <http://localhost:5544?preset=facsat2> works.

### Performance Tests

- **Load Performance**:
  - Verify that the application still loads within 2 seconds.
  - Measure response times for critical actions.
- **Simulation Performance**:
  - Ensure simulations run smoothly at 60 fps with no noticeable drops in frame rate.
  - Test the impact of long-duration simulations on performance.

## Reporting Issues

- **GitHub Tracking**: All issues discovered during testing should be reported and tracked using GitHub's issue tracking system.

## Conclusion

This regression testing guide should serve as a baseline for ensuring that KeepTrack.space maintains its functionality and performance after each update. Since testing is conducted by a solo developer, it's crucial to prioritize testing based on recent changes and known trouble areas, specifically unexpected settings combinations and concurrent feature usage.

## Tips for Effective Testing

- Use diverse scenarios and settings to uncover hidden issues.
- Regularly update test cases to reflect new functionalities and edge cases identified in previous tests.
