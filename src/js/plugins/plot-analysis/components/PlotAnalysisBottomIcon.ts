import linePlotPng from '@app/img/icons/line-plot.png';
import scatterPlotPng from '@app/img/icons/scatter-plot.png';
import scatterPlotPng2 from '@app/img/icons/scatter-plot2.png';
import scatterPlotPng3 from '@app/img/icons/scatter-plot3.png';
import scatterPlotPng4 from '@app/img/icons/scatter-plot4.png';
import { keepTrackApi } from '@app/js/api/keepTrackApi';

export const PlotAnalysisBottomIcon = keepTrackApi.html`
      <div id="menu-plot-analysis" class="bmenu-item bmenu-item-disabled">
        <img
          alt="ECI Plots"
          src="" delayedsrc=${scatterPlotPng2}
        />
        <span class="bmenu-title">ECI Plots</span>
        <div class="status-icon"></div>
      </div>
      <div id="menu-plot-analysis2" class="bmenu-item bmenu-item-disabled">
        <img
          alt="ECF Plots"
          src="" delayedsrc=${scatterPlotPng3}
        />
        <span class="bmenu-title">ECF Plots</span>
        <div class="status-icon"></div>
      </div>
      <div id="menu-plot-analysis3" class="bmenu-item bmenu-item-disabled">
        <img
          alt="RIC Plots"
          src="" delayedsrc=${scatterPlotPng4}
        />
        <span class="bmenu-title">RIC Plots</span>
        <div class="status-icon"></div>
      </div>
      <div id="menu-plot-analysis4" class="bmenu-item">
        <img
          alt="Inc v Lon Plots"
          src="" delayedsrc=${scatterPlotPng}
        />
        <span class="bmenu-title">Inc v Lon Plots</span>
        <div class="status-icon"></div>
      </div>
      <div id="menu-plot-analysis5" class="bmenu-item">
        <img
          alt="Time v Lon Plots"
          src="" delayedsrc=${linePlotPng}
        />
        <span class="bmenu-title">Time v Lon Plots</span>
        <div class="status-icon"></div>
      </div>
    `;
