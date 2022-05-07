import { keepTrackApi } from '@app/js/api/keepTrackApi';
import './scenario-creator-side-menu.css';

export const scenarioCreatorSideMenu = keepTrackApi.html`
      <div id="scenario-creator-menu" class="side-menu-parent start-hidden text-select scenario-creator-menu-normal">
        <div id="scenario-creator-content" class="side-menu">
        <div class="row">
            <h5 class="center-align">Scenario Creator</h5>
            <form id="scenario-creator-form" class="col s12">
              <div class="input-field col s12">
                <input id="scenario-creator-name" type="text" class="validate">
                <label class="active">Scenario Name</label>
              </div>
              <div class="input-field col s12">
                <input id="scenario-creator-start" type="text" class="validate" placeholder="YYYY JJJ HH:MM:SS">
                <label class="active">Start Time</label>
              </div>
              <div class="input-field col s12">
                <input id="scenario-creator-stop" type="text" class="validate" placeholder="YYYY JJJ HH:MM:SS">
                <label class="active">Stop Time</label>
              </div>
              <div class="input-field col s12">
                <select id="scenario-creator-density">
                <option value="1">1 Percent</option>
                  <option value="10">10 Percent</option>
                  <option value="25">25 Percent</option>
                  <option value="50">50 Percent</option>
                  <option value="75">75 Percent</option>
                  <option value="100">100 Percent</option>
                </select>
                <label>Satellite Density</label>
              </div>
              <div class="center-align">
                <button class="btn btn-ui waves-effect waves-light" type="submit" name="action">Create Scenario &#9658;</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    `;
