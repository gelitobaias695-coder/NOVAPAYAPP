export interface CurrencyConfig {
  code: string;
  symbol: string;
  name: string;
  country: string;
  countryCode: string;
  flag: string;
}

export const currencies: CurrencyConfig[] = [
  { code: "ZAR", symbol: "R",   name: "South African Rand",      country: "South Africa", countryCode: "ZA", flag: "🇿🇦" },
  { code: "KES", symbol: "KSh", name: "Kenyan Shilling",         country: "Kenya",        countryCode: "KE", flag: "🇰🇪" },
  { code: "TZS", symbol: "TSh", name: "Tanzanian Shilling",      country: "Tanzania",     countryCode: "TZ", flag: "🇹🇿" },
  { code: "NGN", symbol: "₦",   name: "Nigerian Naira",          country: "Nigeria",      countryCode: "NG", flag: "🇳🇬" },
  { code: "GHS", symbol: "GH₵", name: "Ghanaian Cedi",           country: "Ghana",        countryCode: "GH", flag: "🇬🇭" },
  { code: "MZN", symbol: "MT",  name: "Metical Moçambicano",     country: "Mozambique",   countryCode: "MZ", flag: "🇲🇿" },
];

export function formatPriceValue(amount: number, currencyCode: string): string {
  const currency = currencies.find(c => c.code === currencyCode);
  if (!currency) return `${amount}`;

  // Custom mapping for Locales to get accurate `Intl.NumberFormat` representations
  const localeMap: Record<string, string> = {
    ZAR: "en-ZA",
    KES: "en-KE",
    TZS: "en-TZ",
    NGN: "en-NG",
    GHS: "en-GH",
    MZN: "pt-MZ",
  };

  const formatter = new Intl.NumberFormat(localeMap[currency.code] || "en-ZA", {
    style: "currency",
    currency: currency.code,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  // Custom symbols
  const customSymbols: Record<string, string> = {
    ZAR: "R",
    KES: "KSh",
    TZS: "TSh",
    NGN: "₦",
    GHS: "GH₵",
    MZN: "MT",
  };

  const formatted = formatter.format(amount);

  // Replace standard ISO symbols with custom defined symbols where needed
  return formatted.replace(/[A-Z]{3}/, customSymbols[currency.code] || currency.symbol).trim();
}
