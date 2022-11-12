import { keepTrackApi } from '@app/js/api/keepTrackApi';

export const helpTitleTextNewLaunch = `New Launch Menu`;

export const helpBodyTextNewLaunch = keepTrackApi.html`The New Launch Menu is used for generating notional orbital launches by modifying existing satellites with similar parameters.
<br><br>
After selecting a satellite, you can select a launch location and a north/south azimuth. 
The selected satellite will be modified to align it with the launch site. 
The clock is then changed to 00:00:00 to represent relative time after the launch. 
This can be helpful in calculating sensor coverage relative to launch time. 
The objects relationship with other orbital objects will be incorrect.
`;
