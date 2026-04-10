// =============================================================================
// cn.ts — Tailwind CSS class merging utility
// =============================================================================
// This tiny helper combines clsx (which handles conditional class names, arrays,
// and objects) with tailwind-merge (which intelligently resolves conflicting
// Tailwind classes like "px-2 px-4" into just "px-4"). Without tailwind-merge,
// you'd get both classes in the DOM and the last one might not win due to CSS
// specificity. This pattern is basically standard in every Tailwind + React project.
// =============================================================================

import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}
