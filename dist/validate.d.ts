export interface ReportEntry {
    url: string;
    path: string;
    message: string;
}
export interface SectionReport {
    id: string;
    url: string;
    ok: boolean;
    errors: ReportEntry[];
}
export interface Report {
    url: string;
    manifest_url: string;
    ok: boolean;
    score: number;
    errors: ReportEntry[];
    warnings: ReportEntry[];
    sections: SectionReport[];
}
export interface ValidateOptions {
    fetch?: typeof globalThis.fetch;
}
export declare function validateSite(url: string, options?: ValidateOptions): Promise<Report>;
