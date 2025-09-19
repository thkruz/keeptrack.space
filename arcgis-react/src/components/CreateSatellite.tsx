import React, { useEffect, useState } from 'react';
import './CreateSatellite.css';

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

interface CreateSatelliteProps {
    isVisible: boolean;
    onClose: () => void;
    onSatelliteCreated: (satellite: any) => void;
}

const SATELLITE_TYPES = [
    { value: '1', label: 'Payload', icon: '🛰️' },
    { value: '2', label: 'Rocket Body', icon: '🚀' },
    { value: '3', label: 'Debris', icon: '🗑️' },
    { value: '4', label: 'Special', icon: '⭐' }
];

const COUNTRIES = [
    { value: 'TBD', label: 'Unknown' },
    { value: 'US', label: 'United States' },
    { value: 'RU', label: 'Russia' },
    { value: 'CN', label: 'China' },
    { value: 'IN', label: 'India' },
    { value: 'JP', label: 'Japan' },
    { value: 'EU', label: 'European Union' },
    { value: 'CA', label: 'Canada' },
    { value: 'AU', label: 'Australia' },
    { value: 'BR', label: 'Brazil' },
    { value: 'KR', label: 'South Korea' },
    { value: 'IL', label: 'Israel' },
    { value: 'IR', label: 'Iran' },
    { value: 'GB', label: 'United Kingdom' }
];

export const CreateSatellite: React.FC<CreateSatelliteProps> = ({
    isVisible,
    onClose,
    onSatelliteCreated
}) => {
    const [formData, setFormData] = useState<SatelliteFormData>({
        scc: '90000',
        type: '1',
        country: 'TBD',
        year: '',
        day: '',
        inc: '',
        rasc: '',
        ecen: '',
        argPe: '',
        meana: '',
        meanmo: '',
        period: '',
        source: '',
        name: ''
    });

    const [errors, setErrors] = useState<Partial<SatelliteFormData>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [currentStep, setCurrentStep] = useState(1);

    // Auto-generate current epoch
    useEffect(() => {
        const now = new Date();
        const year = now.getUTCFullYear().toString().slice(-2);
        const dayOfYear = Math.floor((now.getTime() - new Date(now.getUTCFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
        const fractionalDay = (now.getUTCHours() * 3600 + now.getUTCMinutes() * 60 + now.getUTCSeconds()) / 86400;

        setFormData(prev => ({
            ...prev,
            year: year,
            day: (dayOfYear + fractionalDay).toFixed(8)
        }));
    }, []);

    const handleInputChange = (field: keyof SatelliteFormData, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        // Clear error when user starts typing
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: undefined }));
        }
    };

    const validateForm = (): boolean => {
        const newErrors: Partial<SatelliteFormData> = {};
        console.log('Validating form with data:', formData);

        // Required fields validation
        if (!formData.scc || formData.scc.length < 5) {
            newErrors.scc = 'NORAD ID must be 5 digits';
        } else if (parseInt(formData.scc) < 90000 || parseInt(formData.scc) > 99999) {
            newErrors.scc = 'NORAD ID must be between 90000-99999';
        }

        if (!formData.name.trim()) {
            newErrors.name = 'Satellite name is required';
        }

        if (!formData.inc || isNaN(parseFloat(formData.inc))) {
            newErrors.inc = 'Valid inclination required (0-180°)';
        } else {
            const inc = parseFloat(formData.inc);
            if (inc < 0 || inc > 180) {
                newErrors.inc = 'Inclination must be 0-180°';
            }
        }

        if (!formData.rasc || isNaN(parseFloat(formData.rasc))) {
            newErrors.rasc = 'Valid right ascension required (0-360°)';
        } else {
            const rasc = parseFloat(formData.rasc);
            if (rasc < 0 || rasc >= 360) {
                newErrors.rasc = 'Right ascension must be 0-359.999°';
            }
        }

        if (!formData.ecen || isNaN(parseFloat(formData.ecen))) {
            newErrors.ecen = 'Valid eccentricity required (0-1)';
        } else {
            const ecen = parseFloat(formData.ecen);
            if (ecen < 0 || ecen >= 1) {
                newErrors.ecen = 'Eccentricity must be 0-0.999';
            }
        }

        if (!formData.argPe || isNaN(parseFloat(formData.argPe))) {
            newErrors.argPe = 'Valid argument of perigee required (0-360°)';
        } else {
            const argPe = parseFloat(formData.argPe);
            if (argPe < 0 || argPe >= 360) {
                newErrors.argPe = 'Argument of perigee must be 0-359.999°';
            }
        }

        if (!formData.meana || isNaN(parseFloat(formData.meana))) {
            newErrors.meana = 'Valid mean anomaly required (0-360°)';
        } else {
            const meana = parseFloat(formData.meana);
            if (meana < 0 || meana >= 360) {
                newErrors.meana = 'Mean anomaly must be 0-359.999°';
            }
        }

        if (!formData.meanmo || isNaN(parseFloat(formData.meanmo))) {
            newErrors.meanmo = 'Valid mean motion required (0.1-20 rev/day)';
        } else {
            const meanmo = parseFloat(formData.meanmo);
            if (meanmo < 0.1 || meanmo > 20) {
                newErrors.meanmo = 'Mean motion must be 0.1-20 rev/day';
            }
        }

        setErrors(newErrors);
        console.log('Validation errors:', newErrors);
        console.log('Validation passed:', Object.keys(newErrors).length === 0);
        return Object.keys(newErrors).length === 0;
    };

    const calculatePeriod = (meanMotion: number): number => {
        return 1440 / meanMotion; // minutes per day / rev per day = minutes per revolution
    };

    const handleMeanMotionChange = (value: string) => {
        handleInputChange('meanmo', value);
        if (value && !isNaN(parseFloat(value))) {
            const period = calculatePeriod(parseFloat(value));
            handleInputChange('period', period.toFixed(4));
        }
    };

    const handleSubmit = async () => {
        console.log('Form submission started');
        console.log('Form data:', formData);

        if (!validateForm()) {
            console.log('Form validation failed');
            return;
        }

        console.log('Form validation passed');
        setIsSubmitting(true);

        try {
            // Call the callback with the satellite data
            onSatelliteCreated(formData);

            // Reset form
            setFormData({
                scc: '90000',
                type: '1',
                country: 'TBD',
                year: '',
                day: '',
                inc: '',
                rasc: '',
                ecen: '',
                argPe: '',
                meana: '',
                meanmo: '',
                period: '',
                source: '',
                name: ''
            });
            setCurrentStep(1);
            setErrors({});

            // Close the modal
            onClose();
        } catch (error) {
            console.error('Error creating satellite:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const nextStep = () => {
        if (currentStep < 3) {
            setCurrentStep(currentStep + 1);
        }
    };

    const prevStep = () => {
        if (currentStep > 1) {
            setCurrentStep(currentStep - 1);
        }
    };

    if (!isVisible) return null;

    return (
        <div className="create-satellite-overlay">
            <div className="create-satellite-panel">
                <div className="panel-header">
                    <div className="header-left">
                        <h2>Create Satellite</h2>
                        <div className="step-indicator">
                            Step {currentStep} of 3
                        </div>
                    </div>
                    <button className="close-button" onClick={onClose}>×</button>
                </div>

                <div className="panel-content">
                    <div className="form-steps">
                        {/* Step 1: Basic Information */}
                        {currentStep === 1 && (
                            <div className="form-step">
                                <h3>Basic Information</h3>

                                <div className="form-group">
                                    <label htmlFor="scc">NORAD ID *</label>
                                    <input
                                        id="scc"
                                        type="text"
                                        value={formData.scc}
                                        onChange={(e) => handleInputChange('scc', e.target.value)}
                                        className={errors.scc ? 'error' : ''}
                                        placeholder="90000-99999"
                                        maxLength={5}
                                    />
                                    {errors.scc && <span className="error-text">{errors.scc}</span>}
                                </div>

                                <div className="form-group">
                                    <label htmlFor="name">Satellite Name *</label>
                                    <input
                                        id="name"
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => handleInputChange('name', e.target.value)}
                                        className={errors.name ? 'error' : ''}
                                        placeholder="Enter satellite name"
                                        maxLength={24}
                                    />
                                    {errors.name && <span className="error-text">{errors.name}</span>}
                                </div>

                                <div className="form-group">
                                    <label htmlFor="type">Object Type</label>
                                    <select
                                        id="type"
                                        value={formData.type}
                                        onChange={(e) => handleInputChange('type', e.target.value)}
                                    >
                                        {SATELLITE_TYPES.map(type => (
                                            <option key={type.value} value={type.value}>
                                                {type.icon} {type.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label htmlFor="country">Country</label>
                                    <select
                                        id="country"
                                        value={formData.country}
                                        onChange={(e) => handleInputChange('country', e.target.value)}
                                    >
                                        {COUNTRIES.map(country => (
                                            <option key={country.value} value={country.value}>
                                                {country.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label htmlFor="source">Data Source</label>
                                    <input
                                        id="source"
                                        type="text"
                                        value={formData.source}
                                        onChange={(e) => handleInputChange('source', e.target.value)}
                                        placeholder="e.g., NASA, SpaceX, etc."
                                        maxLength={24}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Step 2: Epoch Information */}
                        {currentStep === 2 && (
                            <div className="form-step">
                                <h3>Epoch Information</h3>
                                <p className="step-description">
                                    The epoch defines when the orbital elements are valid.
                                    Current time is auto-filled.
                                </p>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label htmlFor="year">Epoch Year *</label>
                                        <input
                                            id="year"
                                            type="text"
                                            value={formData.year}
                                            onChange={(e) => handleInputChange('year', e.target.value)}
                                            className={errors.year ? 'error' : ''}
                                            placeholder="24"
                                            maxLength={2}
                                        />
                                        {errors.year && <span className="error-text">{errors.year}</span>}
                                    </div>

                                    <div className="form-group">
                                        <label htmlFor="day">Epoch Day *</label>
                                        <input
                                            id="day"
                                            type="text"
                                            value={formData.day}
                                            onChange={(e) => handleInputChange('day', e.target.value)}
                                            className={errors.day ? 'error' : ''}
                                            placeholder="123.45678901"
                                            maxLength={12}
                                        />
                                        {errors.day && <span className="error-text">{errors.day}</span>}
                                    </div>
                                </div>

                                <div className="info-box">
                                    <strong>Epoch Format:</strong><br />
                                    Year: Last 2 digits of year (e.g., 24 for 2024)<br />
                                    Day: Day of year + fractional day (e.g., 123.45678901)
                                </div>
                            </div>
                        )}

                        {/* Step 3: Orbital Elements */}
                        {currentStep === 3 && (
                            <div className="form-step">
                                <h3>Orbital Elements</h3>
                                <p className="step-description">
                                    Define the satellite's orbital parameters. All angles in degrees.
                                </p>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label htmlFor="inc">Inclination *</label>
                                        <input
                                            id="inc"
                                            type="text"
                                            value={formData.inc}
                                            onChange={(e) => handleInputChange('inc', e.target.value)}
                                            className={errors.inc ? 'error' : ''}
                                            placeholder="51.6"
                                            maxLength={8}
                                        />
                                        {errors.inc && <span className="error-text">{errors.inc}</span>}
                                        <small>0° - 180°</small>
                                    </div>

                                    <div className="form-group">
                                        <label htmlFor="rasc">Right Ascension *</label>
                                        <input
                                            id="rasc"
                                            type="text"
                                            value={formData.rasc}
                                            onChange={(e) => handleInputChange('rasc', e.target.value)}
                                            className={errors.rasc ? 'error' : ''}
                                            placeholder="0.0"
                                            maxLength={8}
                                        />
                                        {errors.rasc && <span className="error-text">{errors.rasc}</span>}
                                        <small>0° - 359.999°</small>
                                    </div>
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label htmlFor="ecen">Eccentricity *</label>
                                        <input
                                            id="ecen"
                                            type="text"
                                            value={formData.ecen}
                                            onChange={(e) => handleInputChange('ecen', e.target.value)}
                                            className={errors.ecen ? 'error' : ''}
                                            placeholder="0.0"
                                            maxLength={7}
                                        />
                                        {errors.ecen && <span className="error-text">{errors.ecen}</span>}
                                        <small>0.0 - 0.999</small>
                                    </div>

                                    <div className="form-group">
                                        <label htmlFor="argPe">Argument of Perigee *</label>
                                        <input
                                            id="argPe"
                                            type="text"
                                            value={formData.argPe}
                                            onChange={(e) => handleInputChange('argPe', e.target.value)}
                                            className={errors.argPe ? 'error' : ''}
                                            placeholder="0.0"
                                            maxLength={8}
                                        />
                                        {errors.argPe && <span className="error-text">{errors.argPe}</span>}
                                        <small>0° - 359.999°</small>
                                    </div>
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label htmlFor="meana">Mean Anomaly *</label>
                                        <input
                                            id="meana"
                                            type="text"
                                            value={formData.meana}
                                            onChange={(e) => handleInputChange('meana', e.target.value)}
                                            className={errors.meana ? 'error' : ''}
                                            placeholder="0.0"
                                            maxLength={8}
                                        />
                                        {errors.meana && <span className="error-text">{errors.meana}</span>}
                                        <small>0° - 359.999°</small>
                                    </div>

                                    <div className="form-group">
                                        <label htmlFor="meanmo">Mean Motion *</label>
                                        <input
                                            id="meanmo"
                                            type="text"
                                            value={formData.meanmo}
                                            onChange={(e) => handleMeanMotionChange(e.target.value)}
                                            className={errors.meanmo ? 'error' : ''}
                                            placeholder="15.0"
                                            maxLength={11}
                                        />
                                        {errors.meanmo && <span className="error-text">{errors.meanmo}</span>}
                                        <small>0.1 - 20 rev/day</small>
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label htmlFor="period">Period (calculated)</label>
                                    <input
                                        id="period"
                                        type="text"
                                        value={formData.period}
                                        readOnly
                                        className="readonly"
                                    />
                                    <small>Automatically calculated from mean motion</small>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="form-actions">
                        <div className="step-buttons">
                            {currentStep > 1 && (
                                <button
                                    type="button"
                                    className="btn-secondary"
                                    onClick={prevStep}
                                >
                                    ← Previous
                                </button>
                            )}

                            {currentStep < 3 ? (
                                <button
                                    type="button"
                                    className="btn-primary"
                                    onClick={nextStep}
                                >
                                    Next →
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    className="btn-primary"
                                    onClick={handleSubmit}
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? 'Creating...' : 'Create Satellite 🛰️'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
