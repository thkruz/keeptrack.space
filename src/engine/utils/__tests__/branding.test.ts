import Papa from 'papaparse';
import { describe, expect, it } from 'vitest';
import { appendCsvBrandFooter, appendTextBrandFooter, BRAND_URL, brandHtmlDocument, CSV_BRAND_FOOTER } from '../branding';
import { createBrandedCsvBlob, createCsvBlob, stripUtf8Bom } from '../saveVariable';

describe('branding', () => {
  it('adds one CSV footer row and keeps data rows parseable', () => {
    const csv = appendCsvBrandFooter('a,b\n1,2\n3,4\n');

    expect(csv.trimEnd().endsWith(CSV_BRAND_FOOTER)).toBe(true);
    expect(csv).toContain('keeptrack.space');
    expect(appendCsvBrandFooter(csv)).toBe(csv);
    const parsed = Papa.parse<Record<string, string>>(csv, { header: true, skipEmptyLines: true, comments: '#' });

    expect(parsed.data).toEqual([
      { a: '1', b: '2' },
      { a: '3', b: '4' },
    ]);
  });

  it('header-keyed parsers without comment handling still read every data row', () => {
    const parsed = Papa.parse<Record<string, string>>(appendCsvBrandFooter('a,b\n1,2'), { header: true, skipEmptyLines: true });

    expect(parsed.data.slice(0, 1)).toEqual([{ a: '1', b: '2' }]);
  });

  it('createBrandedCsvBlob keeps the BOM and adds the footer; createCsvBlob stays plain', async () => {
    const branded = await createBrandedCsvBlob('x,y\n1,2').text();
    const plain = await createCsvBlob('x,y\n1,2').text();

    expect(stripUtf8Bom(branded)).toContain(BRAND_URL);
    expect(plain).not.toContain(BRAND_URL);
  });

  it('adds a text footer once', () => {
    const t = appendTextBrandFooter('hello');

    expect(t).toContain(BRAND_URL);
    expect(appendTextBrandFooter(t)).toBe(t);
  });

  it('brands HTML with logo header and footer, or URL-only footer when the template has a logo', () => {
    const full = brandHtmlDocument('<html><body><p>x</p></body></html>');

    expect(full).toContain('kt-brand-header');
    expect(full).toContain('kt-brand-footer');
    const urlOnly = brandHtmlDocument('<html><body><p>x</p></body></html>', true);

    expect(urlOnly).not.toContain('kt-brand-header');
    expect(urlOnly).toContain(BRAND_URL);
  });
});
