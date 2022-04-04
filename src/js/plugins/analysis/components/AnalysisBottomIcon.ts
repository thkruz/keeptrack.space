import analysisPng from '@app/img/icons/analysis.png';
import { keepTrackApi } from '@app/js/api/keepTrackApi';

export const AnalysisBottomIcon = keepTrackApi.html`
        <div id="menu-analysis" class="bmenu-item">
          <img
            alt="analysis"
            src=""
            delayedsrc=${analysisPng}/>
          <span class="bmenu-title">Analysis</span>
          <div class="status-icon"></div>
        </div>
      `;
