import { keepTrackApi } from '@app/js/api/keepTrackApi';
import { BestPassTime } from './BestPassTime';
import { TrendAnalysis } from './TrendAnalysis';

export const AnalysisMenuHeader = keepTrackApi.html`
  <h5 class="center-align">Analysis Menu</h5>
  <div class="divider"></div>
  <div class="row"></div>`;

export const ExportTleButton = keepTrackApi.html`
  <div class="row">
    <center>
      <button class="btn btn-ui waves-effect waves-light" 
      onclick="keepTrackApi.programs.satSet.exportTle2Txt(keepTrackApi.programs.satSet.satData);">
        Export TLEs &#9658;
      </button>
    </center>
  </div>`;

export const FindReentries = keepTrackApi.html`
  <div class="row">
    <center>
      <button id="findReentries" class="btn btn-ui waves-effect waves-light">
      Find Reentries &#9658;
      </button>
    </center>
  </div>`;

export const ExportCatalogCsvButton = keepTrackApi.html`
  <div class="row">
    <center>
      <button class="btn btn-ui waves-effect waves-light" 
      onclick="keepTrackApi.programs.satSet.exportTle2Csv(keepTrackApi.programs.satSet.satData);">
        Export Catalog CSV &#9658;
    </button>
    </center>
  </div>`;

export const FindCsoButton = keepTrackApi.html`      
  <div class="row">
    <center>
      <button id="findCsoBtn" class="btn btn-ui waves-effect waves-light">Find Close Objects &#9658;</button>
    </center>
  </div>`;

export const AnalysisSideMenu = keepTrackApi.html`
<div id="analysis-menu" class="side-menu-parent start-hidden text-select">
  <div id="analysis-inner-menu" class="side-menu">
    ${AnalysisMenuHeader}
    ${settingsManager.isOfficialWebsite || !settingsManager.unofficial ? TrendAnalysis : ''}
    ${ExportTleButton}
    ${ExportCatalogCsvButton}
    ${FindCsoButton}
    ${FindReentries}
    ${BestPassTime}       
  </div>
</div>`;
