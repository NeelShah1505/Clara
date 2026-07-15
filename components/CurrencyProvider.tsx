"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/utils/fetcher";

interface CurrencyContextType {
  baseCurrency: string;
  displayCurrency: string;
  rates: Record<string, number> | null;
  convert: (amount: number, fromCurrency?: string) => number;
  format: (amount: number, fromCurrency?: string) => string;
  isLoading: boolean;
}

const CurrencyContext = createContext<CurrencyContextType>({
  baseCurrency: "INR",
  displayCurrency: "INR",
  rates: null,
  convert: (a) => a,
  format: (a) => `${a}`,
  isLoading: true,
});

export const useCurrency = () => useContext(CurrencyContext);

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const { data: settingsData, isLoading: isSettingsLoading } = useSWR("/api/settings", fetcher);
  
  const baseCurrency = settingsData?.settings?.baseCurrency || "INR";
  const displayCurrency = settingsData?.settings?.displayCurrency || "INR";

  // Fetch exchange rates using baseCurrency
  const { data: ratesData, isLoading: isRatesLoading } = useSWR(
    `https://v6.exchangerate-api.com/v6/b95fa5a12c9d2e0568a45b1d/latest/${baseCurrency}`,
    (url) => fetch(url).then(res => res.json())
  );

  const rates = ratesData?.conversion_rates || null;

  const convert = (amount: number, fromCurrency: string = baseCurrency) => {
    if (!rates) return amount;
    
    // If the amount is already in displayCurrency, no need to convert
    if (fromCurrency === displayCurrency) return amount;

    // Convert from 'fromCurrency' -> 'baseCurrency' -> 'displayCurrency'
    const fromRate = rates[fromCurrency] || 1;
    const toRate = rates[displayCurrency] || 1;
    
    // Convert to base currency first (amount / fromRate)
    const baseAmount = amount / fromRate;
    
    // Convert to display currency
    return baseAmount * toRate;
  };

  const format = (amount: number, fromCurrency: string = baseCurrency) => {
    const converted = convert(amount, fromCurrency);
    
    const locale = displayCurrency === "INR" ? "en-IN" : "en-US";
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: displayCurrency,
      maximumFractionDigits: 0,
    }).format(converted);
  };

  return (
    <CurrencyContext.Provider value={{
      baseCurrency,
      displayCurrency,
      rates,
      convert,
      format,
      isLoading: isSettingsLoading || isRatesLoading
    }}>
      {children}
    </CurrencyContext.Provider>
  );
}
