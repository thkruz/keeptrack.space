import { keepTrackApi } from '@app/js/api/keepTrackApi';

export const helpTitleTextAnalysis = `Analysis Menu`;

export const helpBodyTextAnalysis = keepTrackApi.html`The Analysis Menu provides a number of tools to help you analyze the data in the current view. The tools are:
<ul style="margin-left: 40px;">
  <li>Export Official TLEs - Export real two line element sets.</li>
  <li>Export 3LES - Export three line element sets.</li>
  <li>Export KeepTrack TLEs - Export All KeepTrack two line element sets including analysts.</li>
  <li>Export KeepTrack 3LES - Export All KeepTrack three line element sets including analysts.</li>
  <li>Find Close Objects - Find objects that are close to each other.</li>
  <li>Find Reentries - Find objects that are likely to reenter the atmosphere.</li>
  <li>Best Passes - Find the best passes for a satellite based on the currently selected sensor.</li>
</ul>`;
