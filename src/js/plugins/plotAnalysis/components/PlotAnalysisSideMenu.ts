import { keepTrackApi } from '@app/js/api/keepTrackApi';

export const PlotAnalysisSideMenu = keepTrackApi.html`
      <div id="plot-analysis-menu" class="side-menu-parent start-hidden text-select">
        <div id="plot-analysis-content" class="side-menu">
          <div id="plot-analysis-chart" style="width: 100%; height: 90%; padding: 10px; margin: 0;"></div>
        </div>
      </div>
    `;
