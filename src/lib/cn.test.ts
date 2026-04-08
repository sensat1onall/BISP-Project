import { describe, it, expect } from 'vitest';
import { cn } from './cn';

describe('cn (class name merge utility)', () => {
    it('merges multiple class names', () => {
        expect(cn('foo', 'bar')).toBe('foo bar');
    });

    it('resolves Tailwind class conflicts (last wins)', () => {
        expect(cn('p-4', 'p-2')).toBe('p-2');
    });

    it('handles conditional classes', () => {
        expect(cn('text-red-500', false && 'text-blue-500')).toBe('text-red-500');
    });

    it('filters out undefined and null values', () => {
        expect(cn(undefined, null, 'valid')).toBe('valid');
    });

    it('returns empty string for no inputs', () => {
        expect(cn()).toBe('');
    });

    it('merges Tailwind color variants correctly', () => {
        expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500');
    });
});
