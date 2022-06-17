import scatterPlotPng2 from '@app/img/icons/scatter-plot2.png';
import { keepTrackApi } from '@app/js/api/keepTrackApi';

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
