// =============================================================================
// format.ts — Currency formatting utilities for Uzbek Som (UZS)
// =============================================================================
// SafarGo uses UZS (Uzbek Som) as its currency. The tricky thing about UZS is that
// amounts are often in the hundreds of thousands or millions (a typical trip might
// cost 500,000 - 2,000,000 UZS), so showing raw numbers would be ugly and hard to
// read. This formatter shortens big numbers: 1,500,000 becomes "1.5M UZS" and
// 250,000 becomes "250k UZS". Anything under 1000 just shows as-is with "UZS".
// =============================================================================

export const formatCurrency = (amount: number): string => {
    // Millions — e.g., 1,500,000 -> "1.5M UZS"
    if (amount >= 1_000_000) {
        return `${(amount / 1_000_000).toLocaleString(undefined, { maximumFractionDigits: 1 })}M UZS`;
    }
    // Thousands — e.g., 250,000 -> "250k UZS"
    if (amount >= 1000) {
        return `${(amount / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 })}k UZS`;
    }
    // Small amounts just get a comma separator — e.g., 500 -> "500 UZS"
    return `${amount.toLocaleString()} UZS`;
};
