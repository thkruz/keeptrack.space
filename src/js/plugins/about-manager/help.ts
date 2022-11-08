import { keepTrackApi } from '@app/js/api/keepTrackApi';

export const helpTitleText = `About Menu`;

export const helpBodyText = keepTrackApi.html`The About Menu is a place to find information about KeepTrack.
<br><br>
Links to contributors and the source code are available here. 
Additionally you can find information about other projects that are currently using KeepTrack. 
If you have any questions or comments, please contact me at <a href="mailto:theodore.kruczek@gmail.com" target="_blank">
  theodore.kruczek@gmail.com
</a>. If you would like to contribute to KeepTrack, please visit the <a href="https://github.com/thkruz/keeptrack.space" target="_blank">https://github.com/thkruz/keeptrack.space</a>
<br><br>
Frequently Asked Questions:<br>
<br>
Q: How is this different from stuffin.space?<br>
A: KeepTrack is a complete rewrite of stuffin.space. It is written in TypeScript, uses WebGL 2.0 and new shaders, has a new rendering pipeline, has substantially more analysis features, and uses the <a href="https://github.com/thkruz/ootk/" target="_blank">Orbital Object Toolkit</a> for propagation. There isn't a single line of the original code remaining, but the core concept of two web workers for orbits and propagation remains...for now...<br>
<br>
Q: Why would a normal person use some of these features?<br>
A: Many of the features were developed for specific individuals/agencies. They may not be very useful for the general public, but are included just in case.<br>
<br>
Q: Why is the mobile version so limited?<br>
A: The mobile version is limited because it is not possible to run a full desktop application on a mobile device.<br>
<br>
Q: Why do the dots jitter sometimes?<br>
A: The dots jitter because the orbit is being propagated once a second and interpolated between updates. If your PC becomes busy or the time changes the propagation thread will become out of sync for a moment from the main thread.<br>
`;
