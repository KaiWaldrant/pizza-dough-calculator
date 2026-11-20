/** Two significant digits keep very small percentages (e.g. 0.00050%) from rounding to nothing. */
export const formatPercentage = (percentage: number) => String(Number(percentage.toPrecision(2)));
