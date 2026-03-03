import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { CurrencyConfig, currencies, formatPriceValue } from "@/lib/currency";

interface CurrencyContextType {
  currency: CurrencyConfig;
  setCurrency: (code: string) => void;
  rates: Record<string, number> | null;
  isLoading: boolean;
  convertPrice: (priceInZAR: number) => number;
  formatPrice: (amount: number) => string;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currencyCode, setCurrencyCode] = useState<string>(() => {
    return localStorage.getItem("novaPay_currency") || "ZAR";
  });

  const [rates, setRates] = useState<Record<string, number> | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const currency = currencies.find(c => c.code === currencyCode) || currencies[0];

  useEffect(() => {
    localStorage.setItem("novaPay_currency", currencyCode);
  }, [currencyCode]);

  useEffect(() => {
    const fetchRates = async () => {
      setIsLoading(true);
      try {
        const response = await fetch("/api/exchange-rates");
        const data = await response.json();
        if (data && data.rates) {
          setRates(data.rates);
        }
      } catch (error) {
        console.error("Failed to fetch rates:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchRates();
  }, []);

  const setCurrency = (code: string) => {
    const found = currencies.find(c => c.code === code);
    if (found) {
      setIsLoading(true); // show loading indicator on switch change visually
      setCurrencyCode(code);
      setTimeout(() => setIsLoading(false), 300); // 300ms visual loading animation
    }
  };

  const convertPrice = (priceInZAR: number) => {
    if (!rates || !rates[currency.code]) return priceInZAR;
    return Math.round(priceInZAR * rates[currency.code] * 100) / 100;
  };

  const formatPrice = (amount: number) => {
    return formatPriceValue(amount, currency.code);
  };

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, rates, isLoading, convertPrice, formatPrice }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (!context) throw new Error("useCurrency must be used within CurrencyProvider");
  return context;
}
