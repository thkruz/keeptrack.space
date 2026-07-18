import { MenuMode, ToastMsgType } from '@app/engine/core/interfaces';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { EventBus } from '@app/engine/events/event-bus';
import { StorageKey } from '@app/engine/persistence/storage-key';
import { KeepTrackPlugin } from '@app/engine/plugins/base-plugin';
import { IBottomIconConfig, ISideMenuConfig } from '@app/engine/plugins/core/plugin-capabilities';
import { html } from '@app/engine/utils/development/formatter';
import { getEl } from '@app/engine/utils/get-el';
import { PersistenceManager } from '@app/engine/utils/persistence-manager';
import { t7e } from '@app/locales/keys';
import { SearchableFields, SearchableTypes } from '@app/settings/core-settings';
import { SettingsManager } from '@app/settings/settings';
import searchGearPng from '@public/img/icons/search-gear.png';
import './search-settings.css';
import {
  DEFAULT_SEARCHABLE_FIELDS,
  DEFAULT_SEARCHABLE_TYPES,
  MIN_SEARCH_CHARS_DEFAULT,
  parseBool,
  parseMaxResults,
  parseMinSearchChars,
  parseSearchableFields,
  parseSearchableTypes,
  SEARCH_LIMIT_DEFAULT,
  serializeSearchableFields,
  serializeSearchableTypes,
  SHOW_DECAYED_DEFAULT,
  SHOW_VIMPEL_DEFAULT,
} from './search-settings-core';

type T7eKey = Parameters<typeof t7e>[0];
const l = (key: string): string => t7e(`plugins.SearchSettingsPlugin.${key}` as T7eKey);

/** The searchable-field toggles, in display order, paired with their DOM ids. */
const SEARCHABLE_FIELD_KEYS: (keyof SearchableFields)[] = ['name', 'altName', 'bus', 'noradId', 'intlDes', 'launchVehicle'];

/** The searchable object-type toggles, in display order, paired with their DOM ids. */
const SEARCHABLE_TYPE_KEYS: (keyof SearchableTypes)[] = ['satellite', 'missile', 'star', 'sensor', 'launchSite', 'planet'];

export class SearchSettingsPlugin extends KeepTrackPlugin {
  readonly id = 'SearchSettingsPlugin';
  dependencies_ = [];

  getBottomIconConfig(): IBottomIconConfig {
    return {
      elementName: 'search-settings-bottom-icon',
      label: l('bottomIconLabel'),
      image: searchGearPng,
      menuMode: [MenuMode.SETTINGS, MenuMode.ALL],
    };
  }

  getSideMenuConfig(): ISideMenuConfig {
    return {
      elementName: 'search-settings-menu',
      title: l('title'),
      html: this.buildSideMenuHtml_(),
    };
  }

  private buildSideMenuHtml_(): string {
    return html`
      <div id="search-settings-menu" class="side-menu-parent start-hidden kt-ui-v13">
        <div class="side-menu">
          <form id="search-settings-menu-form" class="kt-menu-body">
            ${this.wrapSection_(l('sections.resultLimits'), this.resultLimitsBody_())}
            ${this.wrapSection_(l('sections.objectTypes'), this.searchTypesBody_())}
            ${this.wrapSection_(l('sections.searchFields'), this.searchFieldsBody_())}
            ${this.wrapSection_(l('sections.filters'), this.filtersBody_())}
            ${this.wrapSection_(l('sections.actions'), this.actionsBody_())}
          </form>
        </div>
      </div>
    `;
  }

  /** Wrap a section's controls in a titled v13 card. */
  private wrapSection_(title: string, body: string): string {
    return html`
      <section class="kt-section">
        <div class="kt-section-label">${title}</div>
        ${body}
      </section>
    `;
  }

  private resultLimitsBody_(): string {
    return html`
      <div class="kt-field-row">
        <div class="input-field col s12">
          <input value="${settingsManager.searchLimit.toString()}" id="search-settings-maxResults" type="number" min="1" max="10000"
            data-position="top" data-delay="50" data-tooltip="${l('tooltips.maxResults')}" />
          <label for="search-settings-maxResults" class="active">${l('labels.maxResults')}</label>
        </div>
      </div>
      <div class="kt-field-row">
        <div class="input-field col s12">
          <input value="${settingsManager.minimumSearchCharacters.toString()}" id="search-settings-minSearchChars" type="number" min="1" max="10"
            data-position="top" data-delay="50" data-tooltip="${l('tooltips.minSearchChars')}" />
          <label for="search-settings-minSearchChars" class="active">${l('labels.minSearchChars')}</label>
        </div>
      </div>
    `;
  }

  private searchFieldsBody_(): string {
    return SEARCHABLE_FIELD_KEYS.map((key) => html`
      <div class="switch row">
        <label>
          <input id="search-settings-field-${key}" type="checkbox" ${settingsManager.searchableFields[key] ? 'checked' : ''}/>
          <span class="lever"></span>
          ${l(`labels.fields.${key}`)}
        </label>
      </div>
    `).join('');
  }

  private searchTypesBody_(): string {
    return SEARCHABLE_TYPE_KEYS.map((key) => html`
      <div class="switch row">
        <label>
          <input id="search-settings-type-${key}" type="checkbox" ${settingsManager.searchableTypes[key] ? 'checked' : ''}/>
          <span class="lever"></span>
          ${l(`labels.types.${key}`)}
        </label>
      </div>
    `).join('');
  }

  private filtersBody_(): string {
    return html`
      <div class="switch row">
        <label data-position="top" data-delay="50" data-tooltip="${l('tooltips.showDecayed')}">
          <input id="search-settings-showDecayed" type="checkbox" ${settingsManager.isShowDecayedInSearch ? 'checked' : ''}/>
          <span class="lever"></span>
          ${l('labels.showDecayed')}
        </label>
      </div>
      <div class="switch row">
        <label data-position="top" data-delay="50" data-tooltip="${l('tooltips.showVimpel')}">
          <input id="search-settings-showVimpel" type="checkbox" ${settingsManager.isShowVimpelInSearch ? 'checked' : ''}/>
          <span class="lever"></span>
          ${l('labels.showVimpel')}
        </label>
      </div>
    `;
  }

  private actionsBody_(): string {
    return html`
      <button id="search-settings-reset" type="button" class="kt-action waves-effect">
        <span class="kt-action-label">${l('labels.reset')}</span>
      </button>
    `;
  }

  bottomIconCallback = (): void => {
    this.syncUi_();
  };

  addHtml(): void {
    super.addHtml();
  }

  addJs(): void {
    super.addJs();
    this.loadPersistedSettings_();

    EventBus.getInstance().on(EventBusEvent.uiManagerInit, () => {
      this.wireListeners_();
    });

    // Account sync applied cloud-newer search settings: re-read and re-render
    EventBus.getInstance().on(EventBusEvent.remoteSettingsApplied, (changedKeys) => {
      const searchKeys = new Set<StorageKey>([
        StorageKey.SETTINGS_SEARCH_LIMIT,
        StorageKey.SETTINGS_SHOW_DECAYED_IN_SEARCH,
        StorageKey.SETTINGS_MINIMUM_SEARCH_CHARACTERS,
        StorageKey.SETTINGS_SHOW_VIMPEL_IN_SEARCH,
        StorageKey.SETTINGS_SEARCHABLE_FIELDS,
        StorageKey.SETTINGS_SEARCHABLE_TYPES,
      ]);

      if (changedKeys.some((key) => searchKeys.has(key))) {
        this.loadPersistedSettings_();
        this.syncUi_();
      }
    });
  }

  private wireListeners_() {
    getEl('search-settings-maxResults')?.addEventListener('change', () => {
      this.applyMaxResults_();
    });

    getEl('search-settings-minSearchChars')?.addEventListener('change', () => {
      this.applyMinSearchChars_();
    });

    getEl('search-settings-showDecayed')?.addEventListener('change', () => {
      settingsManager.isShowDecayedInSearch = (<HTMLInputElement>getEl('search-settings-showDecayed'))?.checked ?? SHOW_DECAYED_DEFAULT;
      this.rerunSearch_();
      this.persistSettings_();
    });

    getEl('search-settings-showVimpel')?.addEventListener('change', () => {
      settingsManager.isShowVimpelInSearch = (<HTMLInputElement>getEl('search-settings-showVimpel'))?.checked ?? SHOW_VIMPEL_DEFAULT;
      this.rerunSearch_();
      this.persistSettings_();
    });

    SEARCHABLE_FIELD_KEYS.forEach((key) => {
      getEl(`search-settings-field-${key}`)?.addEventListener('change', () => {
        this.applyField_(key);
      });
    });

    SEARCHABLE_TYPE_KEYS.forEach((key) => {
      getEl(`search-settings-type-${key}`)?.addEventListener('change', () => {
        this.applyType_(key);
      });
    });

    getEl('search-settings-reset')?.addEventListener('click', () => {
      this.resetToDefaults_();
    });
  }

  private applyMaxResults_() {
    const uiManagerInstance = ServiceLocator.getUiManager();
    const maxResultsEl = <HTMLInputElement>getEl('search-settings-maxResults');
    const { value, valid } = parseMaxResults(maxResultsEl?.value);

    if (!valid) {
      maxResultsEl.value = settingsManager.searchLimit.toString();
      uiManagerInstance.toast(l('errorMsgs.InvalidMaxResults'), ToastMsgType.critical);

      return;
    }

    settingsManager.searchLimit = value;
    maxResultsEl.value = value.toString();
    this.rerunSearch_();
    this.persistSettings_();
  }

  private applyMinSearchChars_() {
    const uiManagerInstance = ServiceLocator.getUiManager();
    const minCharsEl = <HTMLInputElement>getEl('search-settings-minSearchChars');
    const { value, valid } = parseMinSearchChars(minCharsEl?.value);

    if (!valid) {
      minCharsEl.value = settingsManager.minimumSearchCharacters.toString();
      uiManagerInstance.toast(l('errorMsgs.InvalidMinSearchChars'), ToastMsgType.critical);

      return;
    }

    settingsManager.minimumSearchCharacters = value;
    minCharsEl.value = value.toString();
    this.rerunSearch_();
    this.persistSettings_();
  }

  private applyField_(key: keyof SearchableFields) {
    const fieldEl = <HTMLInputElement>getEl(`search-settings-field-${key}`);

    settingsManager.searchableFields = {
      ...settingsManager.searchableFields,
      [key]: fieldEl?.checked ?? true,
    };
    this.rerunSearch_();
    this.persistSettings_();
  }

  private applyType_(key: keyof SearchableTypes) {
    const typeEl = <HTMLInputElement>getEl(`search-settings-type-${key}`);

    settingsManager.searchableTypes = {
      ...settingsManager.searchableTypes,
      [key]: typeEl?.checked ?? DEFAULT_SEARCHABLE_TYPES[key],
    };
    this.rerunSearch_();
    this.persistSettings_();
  }

  private resetToDefaults_() {
    settingsManager.searchLimit = SEARCH_LIMIT_DEFAULT;
    settingsManager.minimumSearchCharacters = MIN_SEARCH_CHARS_DEFAULT;
    settingsManager.isShowDecayedInSearch = SHOW_DECAYED_DEFAULT;
    settingsManager.isShowVimpelInSearch = SHOW_VIMPEL_DEFAULT;
    settingsManager.searchableFields = { ...DEFAULT_SEARCHABLE_FIELDS };
    settingsManager.searchableTypes = { ...DEFAULT_SEARCHABLE_TYPES };

    this.syncUi_();
    this.rerunSearch_();
    this.persistSettings_();
    ServiceLocator.getUiManager().toast(l('toasts.reset'), ToastMsgType.normal);
  }

  private rerunSearch_() {
    const searchDom = getEl('search', true) as HTMLInputElement | null;
    const currentSearch = searchDom?.value ?? '';

    if (currentSearch.length > 0) {
      ServiceLocator.getUiManager().searchManager.doSearch(currentSearch);
    }
  }

  private persistSettings_() {
    const persistenceManagerInstance = PersistenceManager.getInstance();

    persistenceManagerInstance.saveItem(StorageKey.SETTINGS_SEARCH_LIMIT, settingsManager.searchLimit.toString());
    persistenceManagerInstance.saveItem(StorageKey.SETTINGS_MINIMUM_SEARCH_CHARACTERS, settingsManager.minimumSearchCharacters.toString());
    persistenceManagerInstance.saveItem(StorageKey.SETTINGS_SHOW_DECAYED_IN_SEARCH, settingsManager.isShowDecayedInSearch.toString());
    persistenceManagerInstance.saveItem(StorageKey.SETTINGS_SHOW_VIMPEL_IN_SEARCH, settingsManager.isShowVimpelInSearch.toString());
    persistenceManagerInstance.saveItem(StorageKey.SETTINGS_SEARCHABLE_FIELDS, serializeSearchableFields(settingsManager.searchableFields));
    persistenceManagerInstance.saveItem(StorageKey.SETTINGS_SEARCHABLE_TYPES, serializeSearchableTypes(settingsManager.searchableTypes));
    SettingsManager.preserveSettings();
  }

  private loadPersistedSettings_() {
    const persistenceManagerInstance = PersistenceManager.getInstance();

    const searchLimitStr = persistenceManagerInstance.getItem(StorageKey.SETTINGS_SEARCH_LIMIT);

    if (searchLimitStr !== null) {
      const { value, valid } = parseMaxResults(searchLimitStr);

      if (valid) {
        settingsManager.searchLimit = value;
      }
    }

    const minCharsStr = persistenceManagerInstance.getItem(StorageKey.SETTINGS_MINIMUM_SEARCH_CHARACTERS);

    if (minCharsStr !== null) {
      const { value, valid } = parseMinSearchChars(minCharsStr);

      if (valid) {
        settingsManager.minimumSearchCharacters = value;
      }
    }

    settingsManager.isShowDecayedInSearch = parseBool(
      persistenceManagerInstance.getItem(StorageKey.SETTINGS_SHOW_DECAYED_IN_SEARCH),
      settingsManager.isShowDecayedInSearch,
    );
    settingsManager.isShowVimpelInSearch = parseBool(
      persistenceManagerInstance.getItem(StorageKey.SETTINGS_SHOW_VIMPEL_IN_SEARCH),
      settingsManager.isShowVimpelInSearch,
    );
    settingsManager.searchableFields = parseSearchableFields(persistenceManagerInstance.getItem(StorageKey.SETTINGS_SEARCHABLE_FIELDS));
    settingsManager.searchableTypes = parseSearchableTypes(persistenceManagerInstance.getItem(StorageKey.SETTINGS_SEARCHABLE_TYPES));
  }

  private syncUi_() {
    const maxResultsEl = <HTMLInputElement>getEl('search-settings-maxResults');

    if (maxResultsEl) {
      maxResultsEl.value = settingsManager.searchLimit.toString();
    }

    const minCharsEl = <HTMLInputElement>getEl('search-settings-minSearchChars');

    if (minCharsEl) {
      minCharsEl.value = settingsManager.minimumSearchCharacters.toString();
    }

    const showDecayedEl = <HTMLInputElement>getEl('search-settings-showDecayed');

    if (showDecayedEl) {
      showDecayedEl.checked = settingsManager.isShowDecayedInSearch;
    }

    const showVimpelEl = <HTMLInputElement>getEl('search-settings-showVimpel');

    if (showVimpelEl) {
      showVimpelEl.checked = settingsManager.isShowVimpelInSearch;
    }

    SEARCHABLE_FIELD_KEYS.forEach((key) => {
      const fieldEl = <HTMLInputElement>getEl(`search-settings-field-${key}`);

      if (fieldEl) {
        fieldEl.checked = settingsManager.searchableFields[key];
      }
    });

    SEARCHABLE_TYPE_KEYS.forEach((key) => {
      const typeEl = <HTMLInputElement>getEl(`search-settings-type-${key}`);

      if (typeEl) {
        typeEl.checked = settingsManager.searchableTypes[key];
      }
    });
  }
}
