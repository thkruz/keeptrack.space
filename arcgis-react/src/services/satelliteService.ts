export interface SatelliteData {
    id: number;
    name: string;
    tle1: string;
    tle2: string;
    norad: string;
    launchDate: string;
    country: string;
    type: number;
    source: string;
    isUserCreated: boolean;
}

export interface SatelliteFormData {
    scc: string;
    type: string;
    country: string;
    year: string;
    day: string;
    inc: string;
    rasc: string;
    ecen: string;
    argPe: string;
    meana: string;
    meanmo: string;
    period: string;
    source: string;
    name: string;
}

export class SatelliteService {
    private static instance: SatelliteService;
    private metaRef: SatelliteData[] = [];
    private worker: Worker | null = null;
    private nextUserSatelliteId = 30000;
    private noradIndex = new Map<string, SatelliteData>();
    private nameIndex = new Map<string, SatelliteData>();

    static getInstance(): SatelliteService {
        if (!SatelliteService.instance) {
            SatelliteService.instance = new SatelliteService();
        }
        return SatelliteService.instance;
    }

    initialize(metadata: SatelliteData[], worker: Worker) {
        this.metaRef = metadata;
        this.worker = worker;
        this.noradIndex.clear();
        this.nameIndex.clear();

        const addNoradVariants = (norad: string | undefined, sat: SatelliteData) => {
            if (!norad) return;
            const trimmed = norad.trim();
            if (!trimmed) return;
            this.noradIndex.set(trimmed, sat);
            const numeric = trimmed.replace(/[^0-9]/g, '');
            if (numeric) {
                this.noradIndex.set(numeric, sat);
                this.noradIndex.set(numeric.padStart(5, '0'), sat);
            }
        };

        const addNameVariant = (name: string | undefined, sat: SatelliteData) => {
            if (!name) return;
            const normalized = this.normalizeName(name);
            if (!normalized) return;
            if (!this.nameIndex.has(normalized)) {
                this.nameIndex.set(normalized, sat);
            }
        };

        for (const sat of metadata) {
            addNoradVariants(sat.norad, sat);
            addNameVariant(sat.name, sat);
        }
        console.log('SatelliteService: Initialized with', metadata.length, 'satellites and worker:', !!worker);
    }

    createSatellite(formData: SatelliteFormData): SatelliteData {
        // Convert form data to TLE format
        const tle1 = this.generateTLE1(formData);
        const tle2 = this.generateTLE2(formData);

        // Create satellite metadata
        const newSatellite: SatelliteData = {
            id: this.nextUserSatelliteId++,
            name: formData.name,
            tle1: tle1,
            tle2: tle2,
            norad: formData.scc,
            launchDate: new Date().toISOString(),
            country: formData.country,
            type: parseInt(formData.type),
            source: formData.source || 'User Created',
            isUserCreated: true
        };

        // Add to metadata array
        this.metaRef.push(newSatellite);

        // Update indexes
        const normalizedName = this.normalizeName(newSatellite.name);
        if (normalizedName && !this.nameIndex.has(normalizedName)) {
            this.nameIndex.set(normalizedName, newSatellite);
        }
        const noradVariants = [newSatellite.norad, newSatellite.norad.replace(/[^0-9]/g, ''), newSatellite.norad.replace(/[^0-9]/g, '').padStart(5, '0')];
        for (const variant of noradVariants) {
            if (variant) {
                this.noradIndex.set(variant, newSatellite);
            }
        }

        // Update worker with new satellite
        if (this.worker) {
            console.log('SatelliteService: Sending satellite to worker:', newSatellite);
            this.worker.postMessage({
                type: 'addSatellite',
                satellite: newSatellite
            });
            console.log('SatelliteService: Message sent to worker');
        } else {
            console.error('SatelliteService: No worker available!');
        }

        return newSatellite;
    }

    getSatelliteById(id: number): SatelliteData | undefined {
        return this.metaRef.find(sat => sat.id === id);
    }

    getAllSatellites(): SatelliteData[] {
        return this.metaRef;
    }

    getUserCreatedSatellites(): SatelliteData[] {
        return this.metaRef.filter(sat => sat.isUserCreated);
    }

    searchSatellites(query: string): SatelliteData[] {
        const lowerQuery = query.toLowerCase();
        return this.metaRef.filter(sat =>
            sat.name.toLowerCase().includes(lowerQuery) ||
            sat.norad.includes(query) ||
            sat.country.toLowerCase().includes(lowerQuery)
        );
    }

    getSatelliteByNorad(noradId: string): SatelliteData | undefined {
        const trimmed = noradId.trim();
        if (this.noradIndex.has(trimmed)) {
            return this.noradIndex.get(trimmed);
        }
        const numeric = trimmed.replace(/[^0-9]/g, '');
        if (numeric) {
            return this.noradIndex.get(numeric) || this.noradIndex.get(numeric.padStart(5, '0'));
        }
        return undefined;
    }

    resolveSatellite(noradId?: string, name?: string): SatelliteData | undefined {
        const candidates = new Set<string>();

        if (noradId) {
            const raw = noradId.toString().trim();
            if (raw) {
                candidates.add(raw);
                const numeric = raw.replace(/[^0-9]/g, '');
                if (numeric) {
                    candidates.add(numeric);
                    candidates.add(numeric.padStart(5, '0'));
                }
            }
        }

        for (const candidate of candidates) {
            const sat = this.noradIndex.get(candidate);
            if (sat) {
                return sat;
            }
        }

        if (name) {
            const normalized = this.normalizeName(name);
            if (normalized) {
                const byName = this.nameIndex.get(normalized);
                if (byName) {
                    return byName;
                }

                const fallback = this.metaRef.find((sat) => {
                    const satNorm = this.normalizeName(sat.name);
                    return satNorm.includes(normalized) || normalized.includes(satNorm);
                });
                if (fallback) {
                    return fallback;
                }
            }
        }

        return undefined;
    }

    private normalizeName(value: string | undefined): string {
        if (!value) return '';
        return value.toLowerCase().replace(/[^a-z0-9]/g, '');
    }

    private generateTLE1(formData: SatelliteFormData): string {
        const scc = formData.scc.padStart(5, '0');
        const epoch = `${formData.year}${formData.day.padStart(12, '0').substring(0, 12)}`;
        const checksum = this.calculateChecksum(`1 ${scc}U ${epoch}  .00000000  00000+0  00000+0 0`);
        return `1 ${scc}U ${epoch}  .00000000  00000+0  00000+0 0  ${checksum}`;
    }

    private generateTLE2(formData: SatelliteFormData): string {
        const scc = formData.scc.padStart(5, '0');
        const inc = parseFloat(formData.inc).toFixed(4).padStart(8, '0');
        const rasc = parseFloat(formData.rasc).toFixed(4).padStart(8, '0');
        const ecen = parseFloat(formData.ecen).toFixed(7).substring(2).padStart(7, '0');
        const argPe = parseFloat(formData.argPe).toFixed(4).padStart(8, '0');
        const meana = parseFloat(formData.meana).toFixed(4).padStart(8, '0');
        const meanmo = parseFloat(formData.meanmo).toFixed(8).padStart(11, '0');
        const revNum = scc.padStart(5, '0');

        const tle2Line = `2 ${scc} ${inc} ${rasc} ${ecen} ${argPe} ${meana} ${meanmo} ${revNum}`;
        const checksum = this.calculateChecksum(tle2Line);
        return `${tle2Line}${checksum}`;
    }

    private calculateChecksum(line: string): number {
        let sum = 0;
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char >= '0' && char <= '9') {
                sum += parseInt(char);
            } else if (char === '-') {
                sum += 1;
            }
        }
        return sum % 10;
    }
}
