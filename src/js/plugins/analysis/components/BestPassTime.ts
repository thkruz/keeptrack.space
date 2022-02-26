import { keepTrackApi } from '@app/js/api/keepTrackApi';

export const BestPassTime = keepTrackApi.html`
<h5 class="center-align">Best Pass Times</h5>
<div class="divider"></div>
<div class="row"></div>
<div class="row">
  <form id="analysis-bpt">
    <div class="row">
      <div class="input-field col s12">
        <input value="25544,00005" id="analysis-bpt-sats" type="text" />
        <label for="analysis-bpt-sats" class="active">Satellite Numbers</label>
      </div>
    </div>
    <div class="row">
      <center>
        <button id="analysis-bpt-submit" class="btn btn-ui waves-effect waves-light" type="submit"
          name="action">Generate Best Pass Times &#9658;</button>
      </center>
    </div>
  </form>
</div>`;
