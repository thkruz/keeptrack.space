import { keepTrackApi } from '@app/js/keepTrackApi';

export const helpTitleTextInitOrbit = `Initial Orbit Menu`;

export const helpBodyTextInitOrbit = keepTrackApi.html`The Initial Orbit Menu is used for generating TLEs using 1-3 state vectors.
<br><br>
Time is in unix time (seconds since 1970-01-01 00:00:00 UTC).
<br><br>
The first state vector is required. The second and third state vectors are optional.
`;
