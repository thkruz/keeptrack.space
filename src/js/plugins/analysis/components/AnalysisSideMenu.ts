import { keepTrackApi } from '@app/js/keepTrackApi';
import { BestPassTime } from './BestPassTime';
import { TrendAnalysis } from './TrendAnalysis';

// TODO: Update to use catalogManagerInstance

export const AnalysisMenuHeader = keepTrackApi.html`
  <h5 class="center-align">Analysis Menu</h5>
  <div class="divider"></div>
  <div class="row"></div>`;

export const ExportTleButton = keepTrackApi.html`
  <div class="row">
    <center>
      <button id="export-catalog-txt-2a" class="btn btn-ui waves-effect waves-light">
        Export Official TLEs &#9658;
      </button>
    </center>
  </div>`;

export const Export3leButton = keepTrackApi.html`
<div class="row">
  <center>
    <button id="export-catalog-txt-3a" class="btn btn-ui waves-effect waves-light">
      Export Official 3LEs &#9658;
    </button>
  </center>
</div>`;

export const ExportTleAllButton = keepTrackApi.html`
  <div class="row">
    <center>
      <button id="export-catalog-txt-2b" class="btn btn-ui waves-effect waves-light">
        Export KeepTrack TLEs &#9658;
      </button>
    </center>
  </div>`;

export const Export3leAllButton = keepTrackApi.html`
<div class="row">
  <center>
  <button id="export-catalog-txt-3b" class="btn btn-ui waves-effect waves-light">
      Export KeepTrack 3LEs &#9658;
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
      <button id="export-catalog-csv-btn" class="btn btn-ui waves-effect waves-light">
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
    <!-- ${TrendAnalysis} -->
    ${ExportTleButton}
    ${Export3leButton}
    ${ExportTleAllButton}
    ${Export3leAllButton}
    ${ExportCatalogCsvButton}
    ${FindCsoButton}
    ${FindReentries}
    ${BestPassTime}
  </div>
</div>`;
