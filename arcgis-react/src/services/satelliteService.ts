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

    static getInstance(): SatelliteService {
        if (!SatelliteService.instance) {
            SatelliteService.instance = new SatelliteService();
        }
        return SatelliteService.instance;
    }

    initialize(metadata: SatelliteData[], worker: Worker) {
        this.metaRef = metadata;
        this.worker = worker;
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
