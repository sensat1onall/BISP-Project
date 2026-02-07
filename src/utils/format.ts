export const formatCurrency = (amount: number) => {
    if (amount >= 1000) {
        return `${(amount / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 })}k UZS`;
    }
    return `${amount.toLocaleString()} UZS`;
};
