import { SatelliteService } from './satelliteService';

export class TooltipService {
    private static instance: TooltipService;
    private tooltip: HTMLElement | null = null;
    private satelliteService: SatelliteService;

    constructor() {
        this.satelliteService = SatelliteService.getInstance();
    }

    static getInstance(): TooltipService {
        if (!TooltipService.instance) {
            TooltipService.instance = new TooltipService();
        }
        return TooltipService.instance;
    }

    createTooltip(): HTMLElement {
        if (this.tooltip) return this.tooltip;

        this.tooltip = document.createElement('div');
        this.tooltip.style.cssText = `
            position: absolute;
            background: rgba(15, 15, 15, 0.95);
            color: white;
            padding: 12px 16px;
            border-radius: 8px;
            font-family: 'Segoe UI', Arial, sans-serif;
            font-size: 12px;
            pointer-events: none;
            z-index: 1000;
            max-width: 250px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
            border: 1px solid rgba(255, 255, 255, 0.15);
            backdrop-filter: blur(10px);
            transition: opacity 0.2s ease-in-out;
        `;
        document.body.appendChild(this.tooltip);
        return this.tooltip;
    }

    showTooltip(x: number, y: number, content: string) {
        const tooltipEl = this.createTooltip();
        tooltipEl.innerHTML = content;
        tooltipEl.style.left = `${x + 10}px`;
        tooltipEl.style.top = `${y - 10}px`;
        tooltipEl.style.display = 'block';
    }

    hideTooltip() {
        if (this.tooltip) {
            this.tooltip.style.display = 'none';
        }
    }

    generateSatelliteTooltip(satelliteId: number, isHover: boolean = false): string | null {
        const satellite = this.satelliteService.getSatelliteById(satelliteId);
        if (!satellite) return null;

        const name = satellite.name || 'Unknown Satellite';
        const norad = satellite.norad || 'N/A';
        const launch = satellite.launchDate ? new Date(satellite.launchDate).toLocaleDateString() : 'Unknown';
        const country = (satellite.country || '').toString().toUpperCase();
        const flagUrl = country && country.length <= 3 ? `/flags/${country.toLowerCase()}.png` : '';
        const img = flagUrl ? `<img src="${flagUrl}" alt="${country}" style="height:${isHover ? '14' : '16'}px;vertical-align:middle;margin-right:8px;border-radius:2px"/>` : '';

        if (isHover) {
            return `
                <div style="line-height: 1.4;">
                    ${img}<strong style="color: #4CAF50;">${name}</strong>
                    <br/>
                    <span style="color: #B0BEC5;">NORAD ID:</span> <span style="color: #FFC107;">${norad}</span>
                    <br/>
                    <span style="color: #B0BEC5;">Launch Date:</span> <span style="color: #E1F5FE;">${launch}</span>
                    ${country ? `<br/><span style="color: #B0BEC5;">Country:</span> <span style="color: #F3E5F5;">${country}</span>` : ''}
                </div>
            `;
        } else {
            return `
                <div style="line-height: 1.5; min-width: 200px;">
                    <div style="border-bottom: 1px solid rgba(255,255,255,0.2); padding-bottom: 6px; margin-bottom: 6px;">
                        ${img}<strong style="color: #4CAF50; font-size: 14px;">${name}</strong>
                    </div>
                    <div style="color: #B0BEC5; font-size: 12px;">
                        <div style="margin-bottom: 4px;">
                            <span style="color: #B0BEC5;">NORAD ID:</span> 
                            <span style="color: #FFC107; font-weight: bold;">${norad}</span>
                        </div>
                        <div style="margin-bottom: 4px;">
                            <span style="color: #B0BEC5;">Launch Date:</span> 
                            <span style="color: #E1F5FE;">${launch}</span>
                        </div>
                        ${country ? `
                            <div style="margin-bottom: 4px;">
                                <span style="color: #B0BEC5;">Country:</span> 
                                <span style="color: #F3E5F5;">${country}</span>
                            </div>
                        ` : ''}
                        <div style="margin-top: 8px; padding-top: 6px; border-top: 1px solid rgba(255,255,255,0.1); color: #81C784; font-size: 11px;">
                            Click again to hide orbit
                        </div>
                    </div>
                </div>
            `;
        }
    }

    dispose() {
        if (this.tooltip) {
            this.tooltip.remove();
            this.tooltip = null;
        }
    }
}
