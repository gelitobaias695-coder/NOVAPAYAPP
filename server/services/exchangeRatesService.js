import fetch from 'node-fetch';

const MOCK_API_URL = "https://api.exchangerate-api.com/v4/latest/ZAR";
let cachedRates = null;
let cacheTimestamp = null;
const CACHE_DURATION = 1000 * 60 * 60;

const FALLBACK_RATES = { ZAR: 1, KES: 7.07, TZS: 141.52, NGN: 83.15, GHS: 0.81 };

export async function getRates() {
    const now = Date.now();
    if (cachedRates && cacheTimestamp && (now - cacheTimestamp < CACHE_DURATION)) {
        return cachedRates;
    }
    let fetchedRates = FALLBACK_RATES;
    try {
        // Use global fetch (Node 18+) or provide a polyfill if necessary
        const response = await fetch(MOCK_API_URL);
        if (response.ok) {
            const data = await response.json();
            if (data?.rates) {
                fetchedRates = {
                    ZAR: data.rates.ZAR || 1,
                    KES: data.rates.KES || FALLBACK_RATES.KES,
                    TZS: data.rates.TZS || FALLBACK_RATES.TZS,
                    NGN: data.rates.NGN || FALLBACK_RATES.NGN,
                    GHS: data.rates.GHS || FALLBACK_RATES.GHS,
                };
            }
        }
    } catch (e) {
        console.warn("Failed to fetch fresh rates, using fallback.", e.message);
    }
    cachedRates = fetchedRates;
    cacheTimestamp = now;
    return cachedRates;
}

export async function convertToZar(amount, currency) {
    if (currency === 'ZAR') return amount;
    const rates = await getRates();
    const rate = rates[currency];
    if (!rate || rate === 0) return amount;
    return amount / rate; // Since rates are 1 ZAR = X Currency
}
