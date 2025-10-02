import React, { useEffect, useMemo, useState } from 'react';

export interface FilterCriteria {
    country?: string | null;
    norad?: string;
    yearFrom?: number | null;
    yearTo?: number | null;
}

interface FilterPanelProps {
    isOpen: boolean;
    countries: string[];
    initialCriteria: FilterCriteria;
    onApply: (criteria: FilterCriteria) => void;
    onClose: () => void;
}

export const FilterPanel: React.FC<FilterPanelProps> = ({
    isOpen,
    countries,
    initialCriteria,
    onApply,
    onClose
}) => {
    const [country, setCountry] = useState<string | null>(initialCriteria.country ?? null);
    const [norad, setNorad] = useState(initialCriteria.norad ?? '');
    const [yearFrom, setYearFrom] = useState<string>(initialCriteria.yearFrom ? String(initialCriteria.yearFrom) : '');
    const [yearTo, setYearTo] = useState<string>(initialCriteria.yearTo ? String(initialCriteria.yearTo) : '');

    useEffect(() => {
        if (isOpen) {
            setCountry(initialCriteria.country ?? null);
            setNorad(initialCriteria.norad ?? '');
            setYearFrom(initialCriteria.yearFrom ? String(initialCriteria.yearFrom) : '');
            setYearTo(initialCriteria.yearTo ? String(initialCriteria.yearTo) : '');
        }
    }, [isOpen, initialCriteria]);

    const hasActiveFilter = useMemo(() => {
        return !!(country || norad.trim() || yearFrom || yearTo);
    }, [country, norad, yearFrom, yearTo]);

    if (!isOpen) {
        return null;
    }

    const handleApply = () => {
        const parsedFrom = yearFrom ? Number(yearFrom) : null;
        const parsedTo = yearTo ? Number(yearTo) : null;

        onApply({
            country: country || null,
            norad: norad.trim() || undefined,
            yearFrom: parsedFrom ?? null,
            yearTo: parsedTo ?? null
        });
    };

    const handleClear = () => {
        setCountry(null);
        setNorad('');
        setYearFrom('');
        setYearTo('');
        onApply({});
    };

    return (
        <div className="filter-panel" role="dialog" aria-modal="true">
            <div className="filter-panel__header">
                <h4>Satellite Filters</h4>
                <button className="filter-panel__close" onClick={onClose} aria-label="Close filters">
                    ×
                </button>
            </div>

            <div className="filter-panel__content">
                <label className="filter-field">
                    <span>Country</span>
                    <select value={country ?? ''} onChange={(e) => setCountry(e.target.value || null)}>
                        <option value="">Any country</option>
                        {countries.map((c) => (
                            <option key={c} value={c}>
                                {c}
                            </option>
                        ))}
                    </select>
                </label>

                <label className="filter-field">
                    <span>NORAD (partial match)</span>
                    <input
                        type="text"
                        value={norad}
                        onChange={(e) => setNorad(e.target.value)}
                        placeholder="e.g. 25544"
                    />
                </label>

                <div className="filter-field filter-field--inline">
                    <label>
                        <span>Launch year (from)</span>
                        <input
                            type="number"
                            inputMode="numeric"
                            value={yearFrom}
                            onChange={(e) => setYearFrom(e.target.value)}
                            placeholder="e.g. 1990"
                        />
                    </label>
                    <label>
                        <span>Launch year (to)</span>
                        <input
                            type="number"
                            inputMode="numeric"
                            value={yearTo}
                            onChange={(e) => setYearTo(e.target.value)}
                            placeholder="e.g. 2024"
                        />
                    </label>
                </div>
            </div>

            <div className="filter-panel__footer">
                <button className="btn secondary" onClick={handleClear} disabled={!hasActiveFilter}>
                    Clear
                </button>
                <button className="btn primary" onClick={handleApply}>
                    Apply Filters
                </button>
            </div>
        </div>
    );
};


