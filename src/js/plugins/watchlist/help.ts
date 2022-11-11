import { keepTrackApi } from '@app/js/api/keepTrackApi';

// Sensors
export const helpTitleTextWatchlist = `Watchlist Menu`;
export const helpBodyTextWatchlist = keepTrackApi.html`
The Watchlist menu allows you to create a list of priority satellites to track. 
This allows you to quickly retrieve the satellites you are most interested in. 
The list is saved in your browser's local storage and will be available the next time you visit the site.
<br><br>
When satellites on the watchlist enter the selected sensor's field of view a notification will be displayed, a line will be drawn from the sensor to the satellite, and the satellite's number will be displayed on the globe.
<br><br>
The overlay feature relies on the watchlist being populated.`;
