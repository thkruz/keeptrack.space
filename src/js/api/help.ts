import { html } from './templateLiterals';

export const helpTitleText = `KeepTrack.Space | Astrodynamics Software for Non-Engineers`;

// NOTE: Cannot import KeepTrackApi since that file will import this file.
export const helpBodyText = html`
KeepTrack aims to provide orbital analysis tools to the average user. 
By providing features that are usually only found in expensive toolkits, 
I try to make learning about orbital mechanics and satellite operations accessible to everyone. 
The software is good enough to provide a common tactical picture on a military operations floor, 
but simple enough a high schooler can learn about orbits on his tablet.
<br><br>
The best way to learn how to use KeepTrack is to play with it. 
The interface is designed to be intuitive and easy to use. While a menu is open, 
if you open the help (top right or press ctrl + F1) it will provide specific help for that menu. 
Some menus cannot be opened unless a satellite and/or sensor is currently selected.
If you are still having trouble, please contact me at <a href="mailto:theodore.kruczek@gmail.com">theodore.kruczek@gmail.com</a>.
<br><br>
Features:<br>
<ul style="margin-left: 40px;">
  <li>Radar and Optical Sensor Information</li>
  <li>Look Angles (Range, Azimuth, and Elevation) Calculations</li>
  <li>Satellite Searching/Filtering</li>
  <li>Breakup Simulation</li>
  <li>Missile Launch Simulation</li>
  <li>New Launch Modeling</li>
  <li>Satellite Editor</li>
  <li>Analysis Functions</li>
  <li>ECI, ECF, and RIC Plots</li>
</ul>
`;
