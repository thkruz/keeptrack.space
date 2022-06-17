import twitterPng from '@app/img/icons/twitter.png';
import { keepTrackApi } from '@app/js/api/keepTrackApi';

export const twitterBottomIcon = keepTrackApi.html`
<div id="menu-twitter" class="bmenu-item">
  <img alt="twitter" src="" delayedsrc="${twitterPng}" />
  <span class="bmenu-title">Twitter</span>
  <div class="status-icon"></div>
</div>
`;
