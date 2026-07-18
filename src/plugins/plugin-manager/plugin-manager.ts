/**
 * plugin-manager.ts — an in-app manager for enabling/disabling built-in plugins
 * and inspecting installed third-party (external) plugins.
 *
 * Plugins load once at boot from settingsManager.plugins, so toggles here are
 * persisted to localStorage (as a sparse diff from the manifest defaults) and
 * applied on the NEXT boot by SettingsManager.loadPersistedPluginToggles_(). The
 * "Reload" banner appears whenever the pending state differs from the running one.
 */
import { MenuMode, ToastMsgType } from '@app/engine/core/interfaces';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { KeepTrackPlugin } from '@app/engine/plugins/base-plugin';
import { IBottomIconConfig, ICommandPaletteCommand, IHelpConfig, ISideMenuConfig } from '@app/engine/plugins/core/plugin-capabilities';
import { html } from '@app/engine/utils/development/formatter';
import { getEl } from '@app/engine/utils/get-el';
import { PersistenceManager, StorageKey } from '@app/engine/utils/persistence-manager';
import { t7e } from '@app/locales/keys';
import { pluginManifest } from '@app/plugins/plugin-manifest';
import { externalPluginMeta } from '@app/plugins/plugin-manifest.external.generated';
import extensionPng from '@public/img/icons/extension.png';
import './plugin-manager.css';

type T7eKey = Parameters<typeof t7e>[0];

const l = (key: string): string => t7e(`plugins.PluginManagerPlugin.${key}` as T7eKey);

interface BuiltinRow {
  configKey: string;
  label: string;
  alwaysEnabled: boolean;
  defaultEnabled: boolean;
}

interface RegistryEntry {
  name: string;
  configKey: string;
  displayName?: string;
  description?: string;
  author?: string;
  repository: string;
  tags?: string[];
  engine?: string;
}

export class PluginManagerPlugin extends KeepTrackPlugin {
  readonly id = 'PluginManagerPlugin';
  dependencies_ = [];
  drawerGroupKey = 'dev-tools';

  static readonly SEARCH_ID = 'plugin-manager-search';
  static readonly RELOAD_BANNER_ID = 'plugin-manager-reload-banner';
  static readonly RELOAD_BTN_ID = 'plugin-manager-reload-btn';
  static readonly INSTALL_INPUT_ID = 'plugin-manager-install-url';
  static readonly INSTALL_COPY_ID = 'plugin-manager-install-copy';

  private readonly builtinRows_: BuiltinRow[] = this.buildBuiltinRows_();
  private readonly bootState_ = new Map<string, boolean>();
  private registryLoaded_ = false;
  private installerAvailable_ = false;

  bottomIconCallback = (): void => {
    this.onBottomIconClick();
  };

  getBottomIconConfig(): IBottomIconConfig {
    return {
      elementName: 'plugin-manager-bottom-icon',
      label: l('bottomIconLabel'),
      image: extensionPng,
      menuMode: [MenuMode.SETTINGS, MenuMode.ALL],
    };
  }

  getSideMenuConfig(): ISideMenuConfig {
    return {
      elementName: 'plugin-manager-menu',
      title: l('title'),
      html: this.buildSideMenuHtml_(),
    };
  }

  getHelpConfig(): IHelpConfig {
    return {
      title: l('title'),
      sections: [
        { heading: t7e('help.overview'), content: l('help.overview') },
        { heading: l('help.togglesHeading'), content: l('help.toggles') },
        { heading: l('help.externalHeading'), content: l('help.external') },
      ],
    };
  }

  getCommandPaletteCommands(): ICommandPaletteCommand[] {
    return [
      {
        id: 'PluginManagerPlugin.open',
        label: l('commandPalette.open'),
        category: 'Settings',
        callback: () => this.bottomMenuClicked(),
      },
    ];
  }

  private buildBuiltinRows_(): BuiltinRow[] {
    const seen = new Set<string>();
    const rows: BuiltinRow[] = [];

    for (const d of pluginManifest) {
      // Skip this manager, external plugins (listed separately), and duplicates.
      if (d.configKey === 'PluginManagerPlugin' || externalPluginMeta[d.configKey] || seen.has(d.configKey)) {
        continue;
      }
      seen.add(d.configKey);
      rows.push({
        configKey: d.configKey,
        label: PluginManagerPlugin.humanize_(d.configKey),
        alwaysEnabled: Boolean(d.alwaysEnabled),
        defaultEnabled: Boolean(d.defaultConfig?.enabled),
      });
    }

    return rows.sort((a, b) => a.label.localeCompare(b.label));
  }

  /** "SelectSatManager" -> "Select Sat Manager". */
  private static humanize_(configKey: string): string {
    return configKey
      .replace(/(?<=[a-z0-9])(?=[A-Z])/gu, ' ')
      .replace(/Plugin$/u, '')
      .trim();
  }

  protected buildSideMenuHtml_(): string {
    return html`
      <div id="plugin-manager-menu" class="side-menu-parent start-hidden kt-ui-v13">
        <div class="side-menu">
          <div class="kt-menu-body">
            <div id="${PluginManagerPlugin.RELOAD_BANNER_ID}" class="pm-reload-banner start-hidden">
              <span class="pm-reload-text">${l('reload.pending')}</span>
              <button id="${PluginManagerPlugin.RELOAD_BTN_ID}" type="button" class="kt-action waves-effect">
                <span class="kt-action-label">${l('reload.button')}</span>
              </button>
            </div>

            <div class="tabs pm-tabs">
              <div class="tab"><a data-pm-tab="installed" class="active">${l('tabs.installed')}</a></div>
              <div class="tab"><a data-pm-tab="browse">${l('tabs.browse')}</a></div>
              <div class="tab"><a data-pm-tab="develop">${l('tabs.develop')}</a></div>
            </div>

            <div class="pm-pane" data-pm-pane="installed">
              ${this.buildInstalledPane_()}
            </div>
            <div class="pm-pane start-hidden" data-pm-pane="browse">
              <div id="pm-browse-content"><p class="pm-develop-text">${l('browse.loading')}</p></div>
            </div>
            <div class="pm-pane start-hidden" data-pm-pane="develop">
              ${this.buildDevelopPane_()}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private buildInstalledPane_(): string {
    return html`
      <section class="kt-section">
        <div class="input-field pm-search-field">
          <input id="${PluginManagerPlugin.SEARCH_ID}" type="text" />
          <label for="${PluginManagerPlugin.SEARCH_ID}">${l('labels.search')}</label>
        </div>
      </section>

      <section class="kt-section">
        <div class="kt-section-label">${l('labels.builtInSection')}</div>
        ${this.builtinRows_.map((r) => this.buildToggleRow_(r)).join('')}
      </section>

      ${this.buildExternalSection_()}

      <section class="kt-section">
        <div class="kt-section-label">${l('labels.installSection')}</div>
        <p class="pm-install-hint">${l('labels.installHint')}</p>
        <div class="input-field pm-install-field">
          <input id="${PluginManagerPlugin.INSTALL_INPUT_ID}" type="text" placeholder="https://github.com/user/keeptrack-plugin-foo" />
          <label for="${PluginManagerPlugin.INSTALL_INPUT_ID}" class="active">${l('labels.gitUrl')}</label>
        </div>
        <button id="${PluginManagerPlugin.INSTALL_COPY_ID}" type="button" class="kt-action waves-effect">
          <span class="kt-action-label">${l('buttons.copyInstall')}</span>
        </button>
      </section>
    `;
  }

  /** The "Develop" tab: a short explainer that teaches the CLI workflow in-app. */
  private buildDevelopPane_(): string {
    return html`
      <section class="kt-section">
        <div class="kt-section-label">${l('develop.introHeading')}</div>
        <p class="pm-develop-text">${l('develop.intro')}</p>
      </section>

      <section class="kt-section">
        <div class="kt-section-label">${l('develop.createHeading')}</div>
        <p class="pm-develop-text">${l('develop.create')}</p>
        ${PluginManagerPlugin.buildCommand_('npm run plugin -- create')}
      </section>

      <section class="kt-section">
        <div class="kt-section-label">${l('develop.previewHeading')}</div>
        <p class="pm-develop-text">${l('develop.preview')}</p>
        ${PluginManagerPlugin.buildCommand_('npm run plugin -- dev MyPlugin')}
      </section>

      <section class="kt-section">
        <div class="kt-section-label">${l('develop.rulesHeading')}</div>
        <ul class="pm-develop-rules">
          <li>${l('develop.rule1')}</li>
          <li>${l('develop.rule2')}</li>
        </ul>
        <a class="pm-doc-link" href="https://keeptrack.space/docs/plugin-development/getting-started/" target="_blank" rel="noopener">
          ${l('develop.docsLink')}
        </a>
      </section>
    `;
  }

  /** A monospace command line with a copy button (wired in uiManagerFinal_). */
  private static buildCommand_(command: string): string {
    return html`
      <div class="pm-command">
        <code class="pm-command-text">${command}</code>
        <button type="button" class="pm-copy-btn waves-effect" data-copy="${command}" kt-tooltip="Copy">&#128203;</button>
      </div>
    `;
  }

  private buildToggleRow_(r: BuiltinRow): string {
    const checked = this.isEnabled_(r.configKey) ? 'checked' : '';
    const disabled = r.alwaysEnabled ? 'disabled' : '';
    const lockIcon = r.alwaysEnabled ? '<span class="pm-lock" title="Always enabled">&#128274;</span>' : '';

    return html`
      <div class="pm-row" data-plugin-name="${r.label.toLowerCase()} ${r.configKey.toLowerCase()}">
        <label class="pm-row-label" kt-tooltip="${r.configKey}">
          <span class="pm-row-name">${r.label}${lockIcon}</span>
          <span class="switch">
            <input type="checkbox" id="pm-toggle-${r.configKey}" data-config-key="${r.configKey}" ${checked} ${disabled} />
            <span class="lever"></span>
          </span>
        </label>
      </div>
    `;
  }

  private buildExternalSection_(): string {
    const keys = Object.keys(externalPluginMeta);

    if (keys.length === 0) {
      return html`
        <section class="kt-section">
          <div class="kt-section-label">${l('labels.externalSection')}</div>
          <p class="pm-empty">${l('labels.externalEmpty')}</p>
        </section>
      `;
    }

    return html`
      <section class="kt-section">
        <div class="kt-section-label">${l('labels.externalSection')}</div>
        ${keys.map((key) => this.buildExternalRow_(key)).join('')}
      </section>
    `;
  }

  private buildExternalRow_(configKey: string): string {
    const meta = externalPluginMeta[configKey];
    const checked = this.isEnabled_(configKey) ? 'checked' : '';
    const badgeClass = meta.compatible ? 'pm-badge-ok' : 'pm-badge-warn';
    const badgeText = meta.compatible ? l('badge.compatible') : l('badge.incompatible');
    const repoLink = meta.repoUrl ? `<a class="pm-repo-link" href="${meta.repoUrl}" target="_blank" rel="noopener">${l('labels.source')}</a>` : '';

    return html`
      <div class="pm-row pm-row-external" data-plugin-name="${configKey.toLowerCase()} ${meta.packageName.toLowerCase()}">
        <label class="pm-row-label" kt-tooltip="${meta.packageName}">
          <span class="pm-row-name">${PluginManagerPlugin.humanize_(configKey)}</span>
          <span class="switch">
            <input type="checkbox" id="pm-toggle-${configKey}" data-config-key="${configKey}" ${checked} />
            <span class="lever"></span>
          </span>
        </label>
        <div class="pm-row-meta">
          <span class="pm-version">v${meta.version}</span>
          <span class="pm-badge ${badgeClass}">${badgeText}</span>
          ${repoLink}
        </div>
      </div>
    `;
  }

  addJs(): void {
    super.addJs();
    EventBus.getInstance().on(EventBusEvent.uiManagerFinal, this.uiManagerFinal_.bind(this));
  }

  protected uiManagerFinal_(): void {
    // Snapshot the running state so we know when a toggle diverges from it.
    for (const r of this.builtinRows_) {
      this.bootState_.set(r.configKey, this.isEnabled_(r.configKey));
    }
    for (const key of Object.keys(externalPluginMeta)) {
      this.bootState_.set(key, this.isEnabled_(key));
    }

    const menu = getEl('plugin-manager-menu');

    menu?.querySelectorAll<HTMLInputElement>('input[data-config-key]').forEach((input) => {
      input.addEventListener('change', () => this.onToggle_(input.dataset.configKey ?? '', input.checked));
    });

    getEl(PluginManagerPlugin.RELOAD_BTN_ID)?.addEventListener('click', () => location.reload());
    getEl(PluginManagerPlugin.INSTALL_COPY_ID)?.addEventListener('click', () => this.copyInstallCommand_());
    getEl(PluginManagerPlugin.SEARCH_ID)?.addEventListener('input', (e) => this.filterRows_((e.target as HTMLInputElement).value));

    menu?.querySelectorAll<HTMLElement>('[data-pm-tab]').forEach((tab) => {
      tab.addEventListener('click', (e) => {
        e.preventDefault();
        this.switchTab_(tab.dataset.pmTab ?? 'installed');
      });
    });

    menu?.querySelectorAll<HTMLElement>('.pm-copy-btn').forEach((btn) => {
      btn.addEventListener('click', () => this.copyCommand_(btn.dataset.copy ?? ''));
    });

    // Initialize the banner (0 pending → hidden, and resolves the {count} label).
    this.updateReloadBanner_();
  }

  private switchTab_(tab: string): void {
    const menu = getEl('plugin-manager-menu');

    menu?.querySelectorAll<HTMLElement>('[data-pm-tab]').forEach((el) => {
      el.classList.toggle('active', el.dataset.pmTab === tab);
    });
    menu?.querySelectorAll<HTMLElement>('[data-pm-pane]').forEach((el) => {
      el.classList.toggle('start-hidden', el.dataset.pmPane !== tab);
    });

    if (tab === 'browse' && !this.registryLoaded_) {
      this.loadRegistry_().catch(() => undefined);
    }
  }

  /** Lazily fetch the plugin registry and render the Browse gallery on first open. */
  private async loadRegistry_(): Promise<void> {
    this.registryLoaded_ = true;
    const container = getEl('pm-browse-content');

    if (!container) {
      return;
    }

    this.installerAvailable_ = await PluginManagerPlugin.probeInstaller_();

    try {
      const base = settingsManager.installDirectory || '/';
      const resp = await fetch(`${base}data/plugins-registry.json`);
      const data = (await resp.json()) as { plugins?: RegistryEntry[] };
      const plugins = data.plugins ?? [];

      if (plugins.length === 0) {
        container.innerHTML = `<p class="pm-empty">${l('browse.empty')}</p>`;

        return;
      }

      container.innerHTML = plugins.map((p) => this.buildRegistryCard_(p)).join('');
      container.querySelectorAll<HTMLButtonElement>('[data-install-repo]').forEach((btn) => {
        btn.addEventListener('click', () => {
          this.installFromRegistry_(btn.dataset.installRepo ?? '', btn).catch(() => undefined);
        });
      });
    } catch {
      container.innerHTML = `<p class="pm-empty">${l('browse.error')}</p>`;
    }
  }

  /** Probe the dev-server one-click install endpoint (absent in static hosting). */
  private static async probeInstaller_(): Promise<boolean> {
    try {
      const resp = await fetch('/__plugin/status', { method: 'GET' });

      return resp.ok;
    } catch {
      return false;
    }
  }

  private buildRegistryCard_(p: RegistryEntry): string {
    const esc = PluginManagerPlugin.escapeHtml_;
    const isInstalled = Boolean(externalPluginMeta[p.configKey]);
    const tags = (p.tags ?? []).map((t) => `<span class="pm-tag">${esc(t)}</span>`).join('');
    const btnLabel = this.installerAvailable_ ? l('browse.install') : l('browse.copyCommand');
    const button = isInstalled
      ? `<button type="button" class="kt-action" disabled><span class="kt-action-label">${l('browse.installedBtn')}</span></button>`
      : `<button type="button" class="kt-action pm-install-registry waves-effect" data-install-repo="${esc(p.repository)}"><span class="kt-action-label">${btnLabel}</span></button>`;

    return `
      <div class="pm-card kt-section">
        <div class="pm-card-title">${esc(p.displayName || p.name)}</div>
        ${p.author ? `<div class="pm-card-author">${l('browse.by')} ${esc(p.author)}</div>` : ''}
        <p class="pm-card-desc">${esc(p.description ?? '')}</p>
        <div class="pm-card-tags">${tags}<span class="pm-card-engine">${esc(p.engine ?? '')}</span></div>
        ${button}
      </div>
    `;
  }

  private async installFromRegistry_(repo: string, btn: HTMLButtonElement): Promise<void> {
    if (!repo) {
      return;
    }

    if (!this.installerAvailable_) {
      this.copyCommand_(`npm run plugin -- add ${repo}`);

      return;
    }

    PluginManagerPlugin.setButtonState_(btn, true, l('browse.installing'));
    const result = await PluginManagerPlugin.postInstall_(repo);

    PluginManagerPlugin.applyInstallResult_(btn, result);
  }

  private static async postInstall_(repo: string): Promise<{ ok: boolean; message?: string }> {
    try {
      const resp = await fetch('/__plugin/install', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repository: repo }),
      });

      return (await resp.json()) as { ok: boolean; message?: string };
    } catch {
      return { ok: false };
    }
  }

  /** Synchronous DOM + toast update from an install result (no awaits here). */
  private static applyInstallResult_(btn: HTMLButtonElement, result: { ok: boolean; message?: string }): void {
    const uiManager = ServiceLocator.getUiManager();

    if (result.ok) {
      uiManager.toast(l('browse.installed'), ToastMsgType.normal);
      PluginManagerPlugin.setButtonState_(btn, true, l('browse.installedBtn'));
    } else {
      uiManager.toast(result.message || l('browse.installFailed'), ToastMsgType.caution);
      PluginManagerPlugin.setButtonState_(btn, false, l('browse.install'));
    }
  }

  private static setButtonState_(btn: HTMLButtonElement, disabled: boolean, labelText: string): void {
    btn.disabled = disabled;
    const label = btn.querySelector('.kt-action-label');

    if (label) {
      label.textContent = labelText;
    }
  }

  private static escapeHtml_(text: string): string {
    return text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
  }

  private copyCommand_(command: string): void {
    if (!command) {
      return;
    }

    const uiManager = ServiceLocator.getUiManager();

    navigator.clipboard
      .writeText(command)
      .then(() => uiManager.toast(l('toasts.commandCopied'), ToastMsgType.normal))
      .catch(() => uiManager.toast(command, ToastMsgType.caution));
  }

  private isEnabled_(configKey: string): boolean {
    const cfg = (settingsManager.plugins as Record<string, { enabled?: boolean } | undefined>)[configKey];

    return cfg?.enabled !== false;
  }

  private onToggle_(configKey: string, enabled: boolean): void {
    if (!configKey) {
      return;
    }

    const overrides = PluginManagerPlugin.readOverrides_();
    // external plugins default enabled
    const defaultEnabled = this.builtinRows_.find((r) => r.configKey === configKey)?.defaultEnabled ?? Boolean(externalPluginMeta[configKey]);

    // Store only the diff from the manifest default; drop the key when they match.
    if (enabled === defaultEnabled) {
      delete overrides[configKey];
    } else {
      overrides[configKey] = enabled;
    }

    PersistenceManager.getInstance().saveItem(StorageKey.PLUGIN_ENABLE_OVERRIDES, JSON.stringify(overrides));
    this.updateReloadBanner_();
  }

  private updateReloadBanner_(): void {
    const menu = getEl('plugin-manager-menu');
    let pending = 0;

    menu?.querySelectorAll<HTMLInputElement>('input[data-config-key]').forEach((input) => {
      const key = input.dataset.configKey ?? '';

      if (this.bootState_.has(key) && input.checked !== this.bootState_.get(key)) {
        pending += 1;
      }
    });

    const banner = getEl(PluginManagerPlugin.RELOAD_BANNER_ID);
    const text = banner?.querySelector('.pm-reload-text');

    if (text) {
      text.textContent = l('reload.pending').replace('{count}', String(pending));
    }
    banner?.classList.toggle('start-hidden', pending === 0);
  }

  private filterRows_(query: string): void {
    const q = query.trim().toLowerCase();
    const menu = getEl('plugin-manager-menu');

    menu?.querySelectorAll<HTMLElement>('.pm-row').forEach((row) => {
      const hay = row.dataset.pluginName ?? '';

      row.classList.toggle('start-hidden', q.length > 0 && !hay.includes(q));
    });
  }

  private copyInstallCommand_(): void {
    const input = getEl(PluginManagerPlugin.INSTALL_INPUT_ID) as HTMLInputElement | null;
    const url = (input?.value || '<git-url>').trim();
    const command = `npm run plugin -- add ${url}`;
    const uiManager = ServiceLocator.getUiManager();

    navigator.clipboard
      .writeText(command)
      .then(() => uiManager.toast(l('toasts.installCopied'), ToastMsgType.normal))
      .catch(() => uiManager.toast(command, ToastMsgType.caution));
  }

  onBottomIconClick(): void {
    // Menu open/close handled by the base class; nothing extra needed here.
  }

  private static readOverrides_(): Record<string, boolean> {
    const raw = PersistenceManager.getInstance().getItem(StorageKey.PLUGIN_ENABLE_OVERRIDES);

    if (!raw) {
      return {};
    }

    try {
      return JSON.parse(raw) as Record<string, boolean>;
    } catch {
      return {};
    }
  }
}
