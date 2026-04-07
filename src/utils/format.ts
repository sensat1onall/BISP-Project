export const formatCurrency = (amount: number): string => {
    if (amount >= 1_000_000) {
        return `${(amount / 1_000_000).toLocaleString(undefined, { maximumFractionDigits: 1 })}M UZS`;
    }
    if (amount >= 1000) {
        return `${(amount / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 })}k UZS`;
    }
    return `${amount.toLocaleString()} UZS`;
};
