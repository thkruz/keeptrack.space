import calendarPng from '@app/img/icons/calendar.png';
import { keepTrackApi } from '@app/js/api/keepTrackApi';

export const LaunchCalendarButton = keepTrackApi.html`
    <div id="menu-launches" class="bmenu-item">
      <img alt="calendar2" src="" delayedsrc="${calendarPng}" />
      <span class="bmenu-title">Launch Calendar</span>
      <div class="status-icon"></div>
    </div> 
  `;
