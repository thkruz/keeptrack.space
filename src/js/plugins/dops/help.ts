import { keepTrackApi } from '@app/js/api/keepTrackApi';

export const helpTitleTextDop = `Dilution of Precision (DOP) Menu`;

export const helpBodyTextDop = keepTrackApi.html`The Dilution of Precision (DOP) Menu is used to calculate the Dilution of Precision (DOP) for a given location and elevation mask.
    <br><br>
    HDOP is the Horizontal Dilution of Precision. It is a measure of the accuracy of the horizontal position.
    <br><br>
    PDOP is the Position Dilution of Precision. It is a measure of the accuracy of the position.
    <br><br>
    GDOP is the Geometric Dilution of Precision. It is a measure of the accuracy of the position.
`;
