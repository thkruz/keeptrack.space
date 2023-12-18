import { keepTrackApi } from '@app/keepTrackApi';
import scatterPlotPng2 from '@public/img/icons/scatter-plot2.png';

export const scenarioCreatorBottomIcon = keepTrackApi.html`
      <div id="menu-scenario-creator" class="bmenu-item bmenu-item-disabled">
        <img
          alt="Scenario Creator"
          src="" delayedsrc=${scatterPlotPng2}
        />
        <span class="bmenu-title">Scenario Creator</span>
        <div class="status-icon"></div>
      </div>
    `;
