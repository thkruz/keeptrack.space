import './PlotAnalysisSideMenu.css';

import { keepTrackApi } from '@app/js/api/keepTrackApi';

export const PlotAnalysisSideMenu = keepTrackApi.html`
      <div id="plot-analysis-menu" class="side-menu-parent start-hidden text-select plot-analysis-menu-normal">
        <div id="plot-analysis-content" class="side-menu">
          <div id="plot-analysis-chart" class="plot-analysis-chart""></div>
        </div>
      </div>
      <div id="plot-analysis-menu2" class="side-menu-parent start-hidden text-select plot-analysis-menu-normal">
        <div id="plot-analysis-content2" class="side-menu">
          <div id="plot-analysis-chart2" class="plot-analysis-chart""></div>
        </div>
      </div>
      <div id="plot-analysis-menu3" class="side-menu-parent start-hidden text-select plot-analysis-menu-normal">
        <div id="plot-analysis-content3" class="side-menu">
          <div id="plot-analysis-chart3" class="plot-analysis-chart""></div>
        </div>
      </div>
      <div id="plot-analysis-menu4" class="side-menu-parent start-hidden text-select plot-analysis-menu-maximized">
        <div id="plot-analysis-content4" class="side-menu">
          <div id="plot-analysis-chart4" class="plot-analysis-chart""></div>
        </div>
      </div>
      <div id="plot-analysis-menu5" class="side-menu-parent start-hidden text-select plot-analysis-menu-maximized">
        <div id="plot-analysis-content5" class="side-menu">
          <div id="plot-analysis-chart5" class="plot-analysis-chart"></div>
        </div>
      </div>
      <div id="plot-analysis-menu6" class="side-menu-parent start-hidden text-select plot-analysis-menu-maximized">
        <div id="plot-analysis-content6" class="side-menu">
          <div id="plot-analysis-chart6" class="plot-analysis-chart"></div>
        </div>
      </div>
    `;
