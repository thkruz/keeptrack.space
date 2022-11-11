import { keepTrackApi } from '@app/js/api/keepTrackApi';

export const helpTitleTextBreakup = `Breakup Menu`;

export const helpBodyTextBreakup = keepTrackApi.html`The Breakup Menu is a tool for simulating the breakup of a satellite.
<br><br>
By modifying duplicating and modifying a satellite's orbit we can model the breakup of a satellite. 
After selecting a satellite and opening the menu, the user can select:
<ul style="margin-left: 40px;">
  <li>Inclination Variation</li>
  <li>RAAN Variation</li>
  <li>Period Variation</li>
  <li>Number of Breakup Pieces</li>
</ul>
The larger the variation the bigger the spread in the simulated breakup. The default variations are sufficient to simulate a breakup with a reasonable spread.
`;
