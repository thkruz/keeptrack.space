import { keepTrackApi } from '@app/js/api/keepTrackApi';

export const helpTitleTextFind = `Find Satellite Menu`;

export const helpBodyTextFind = keepTrackApi.html`The Find Satellite Menu is used for finding satellites by orbital parameters or satellite characteristics.
<br><br>
For most parameters, you type in the target value on the left and then a margin of error on the right. 
For example, if you wanted to find all satellites in a 51-52 degree inclination, you can type 51.5 in the left box and 0.5 in the right box. 
The search will then find all satellites within those inclinations and display them in the search bar.
`;
