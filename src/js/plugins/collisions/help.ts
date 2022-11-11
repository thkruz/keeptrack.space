import { keepTrackApi } from '@app/js/api/keepTrackApi';

export const helpTitleTextCollisions = `Collisions Menu`;

export const helpBodyTextCollisions = keepTrackApi.html`The Collisions Menu shows satellites with a high probability of collision.
<br><br>
Clicking on a row will select the two satellites involved in the collision and change the time to the time of the collision.
`;
