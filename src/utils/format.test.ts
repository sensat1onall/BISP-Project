import { describe, it, expect } from 'vitest';
import { formatCurrency } from './format';

describe('formatCurrency', () => {
    it('formats zero correctly', () => {
        expect(formatCurrency(0)).toBe('0 UZS');
    });

    it('formats small amounts below 1000', () => {
        expect(formatCurrency(500)).toBe('500 UZS');
    });

    it('formats amounts in thousands with k suffix', () => {
        const result = formatCurrency(150000);
        expect(result).toContain('k UZS');
        expect(result).toContain('150');
    });

    it('formats boundary value of 1000', () => {
        const result = formatCurrency(1000);
        expect(result).toContain('k UZS');
    });

    it('formats amounts in millions with M suffix', () => {
        const result = formatCurrency(2500000);
        expect(result).toContain('M UZS');
        expect(result).toContain('2.5');
    });

    it('formats boundary value of 1,000,000', () => {
        const result = formatCurrency(1000000);
        expect(result).toContain('M UZS');
    });
});
