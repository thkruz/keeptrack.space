import { keepTrackApi } from '@app/js/api/keepTrackApi';

// Sensors
export const helpTitleTextSensors = `Sensors Menu`;
export const helpBodyTextSensors = keepTrackApi.html`
The Sensors menu allows you to select a sensor for use in calculations and other menu's functions. 
Sensors are in groups based on the networks they primarily support. 
On the left side of the menu is the name of the sensor and on the right side is the country/organization that owns it.
<br><br>
Selecting an "All...Sensors" option will select all sensors in that group. 
This is useful for visualizing the networks coverage, but currently does not work for all calculations. 
If you are trying to calculate look angles for a network it is best to use the multi-site look angles tool or 
to use look angles for each of the individual sensors in the network.
<br><br>
Sensors on this list include Mechanical and Phased Array Radars, in addition to Optical sensors: 
<ul style="margin-left: 40px;">
  <li>
    Phased Array Radars typically are limited to Low Earth Orbit (LEO).
  </li>
  <li>
    Mechanical Radars can be used for both LEO and Geostationary Orbit (GEO). 
  </li>
  <li>
    Optical sensors are typically used for GEO, but can also be used for LEO. 
  </li>
  <li>
    Optical sensors are limited to night time observations in clear skies, whereas radars can be used for both day and night.
  </li>
</ul>
<br>
Sensor information is based on publicly available data and can be verified in the Sensor Info menu. 
If you have public data on additional sensors or corrections to existing sensor information please contact me at <a href="mailto:theodore.kruczek@gmail.com">theodore.kruczek@gmail.com</a>.`;

// Custom Sensor
export const helpTitleTextCustomSensor = `Custom Sensor Menu`;
export const helpBodyTextCustomSensor = keepTrackApi.html`
This allows you to create a custom sensor for use in calculations and other menu's functions. 
This can be a completely original sensor or a modification of an existing sensor.
<br><br>
After setting the latitude, longitude, and altitude of the sensor, you can set the sensor's field of view. 
Selecting telescope will create a 360 degree field of view with an elevation mask of 10 degrees and unlimited range. 
Deselecting the telescope option will allow you to set the field of view manually.
<br><br>
If you are trying to edit an existing sensor, you can select it from the sensor list first and the custom sensor will be updated with the selected sensor's information.`;

// Sensor Info
export const helpTitleTextSensorInfo = `Sensor Info`;
export const helpBodyTextSensorInfo = keepTrackApi.html`
Sensor Info provides information about the currently selected sensor. 
The information is based on publicly available data and may not always be 100% accurate. 
If you have public data on additional sensors or corrections to existing sensor information please contact me at <a href="mailto:theodore.kruczek@gmail.com">theodore.kruczek@gmail.com</a>.
<br><br>
The information provided includes:
<ul style="margin-left: 40px;">
  <li>
    Sensor Name
  </li>
  <li>
    Sensor Owner
  </li>  
  <li>
    Sensor Type
  </li>
  <li>
    Sensor Field of View
  </li>
</ul>
<br>
Additionally, lines can be quickly created from the sensor to the sun or moon from this menu.`;

// Look Angles
export const helpTitleTextLookAngles = `Look Angles Menu`;
export const helpBodyTextLookAngles = keepTrackApi.html`
The Look Angles menu allows you to calculate the range, azimuth, and elevation angles between a sensor and a satellite. 
A satellite and sensor must first be selected before the menu can be used.
<br><br>
The toggle only rise and set times will only calculate the rise and set times of the satellite. 
This is useful for quickly determining when a satellite will be visible to a sensor.
<br><br>
The search range can be modified by changing the length and interval options.`;

// Multi Look Angles
export const helpTitleTextMultiLookAngles = `Multi-Site Look Angles Menu`;
export const helpBodyTextMultiLookAngles = keepTrackApi.html`
The Multi-Site Look Angles menu allows you to calculate the range, azimuth, and elevation angles between a satellite and multiple sensors. 
A satellite must first be selected before the menu can be used.
<br><br>
By default the menu will calculate the look angles for all sensors in the Space Surveillance Netowrk. 
If you would like to calculate the look angles for additional sensors, you can export a csv file at the bottom of the menu. 
The csv file will contain look angles for all sensors.
<br><br>
Clicking on a row in the table will select the sensor and change the simulation time to the time of the look angle.`;
