import { createContext, useContext, useState, useEffect } from "react";
import { getCurrencySymbol } from "../../utils/currencySymbols";
import { useAuth } from "./AuthContext";

type CurrencyContextType = {
  currency: string;
  updateCurrency: (curr: string) => Promise<void>;
  formatCurrency: (amount: number) => string;
  getSymbol: (currencyCode: string) => string;
  rates: Record<string, number>;
};

const CurrencyContext = createContext<CurrencyContextType | null>(null);

const formatIndianNumber = (amount: number): string => {
  const isNegative = amount < 0;
  const abs = Math.abs(amount);

  const [intPart, decPart] = abs.toFixed(2).split(".");

  let formattedInt: string;
  if (intPart.length <= 3) {
    formattedInt = intPart;
  } else {
    const last3 = intPart.slice(-3);
    const rest = intPart.slice(0, -3);
    const restGrouped = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",");
    formattedInt = `${restGrouped},${last3}`;
  }

  return `${isNegative ? "-" : ""}${formattedInt}.${decPart}`;
};

export const CurrencyProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { user } = useAuth();

  const [currency, setCurrency] = useState<string>(
    () => user?.defaultCurrency ?? "INR",
  );

  useEffect(() => {
    if (user?.defaultCurrency && user.defaultCurrency !== currency) {
      setCurrency(user.defaultCurrency);
    }
  }, [user?.defaultCurrency]);

  const updateCurrency = async (curr: string): Promise<void> => {
    const token = localStorage.getItem("accessToken");
    if (!token) throw new Error("No token found");

    const res = await fetch(`${import.meta.env.VITE_API_URL}/users/currency`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ defaultCurrency: curr }),
    });
    const data = await res.json();
    if (!res.ok || !data.success)
      throw new Error(data.message || "Failed to update currency");

    if (data.token) localStorage.setItem("accessToken", data.token);
    setCurrency(curr);
  };

  const formatCurrency = (amount: number): string => {
    const symbol = getCurrencySymbol(currency);
    if (amount === undefined || amount === null || isNaN(amount))
      return `${symbol}0.00`;

    try {
      if (currency === "INR") {
        // Indian numbering system
        return `${symbol}${formatIndianNumber(amount)}`;
      }

      // Other currencies — use Intl with en-IN locale so grouping is consistent
      return `${symbol}${new Intl.NumberFormat("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount)}`;
    } catch {
      return `${symbol}${Number(amount).toFixed(2)}`;
    }
  };

  const getSymbol = (code: string) => getCurrencySymbol(code);

  return (
    <CurrencyContext.Provider
      value={{ currency, updateCurrency, formatCurrency, getSymbol, rates: {} }}
    >
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = () => {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error("useCurrency must be used within CurrencyProvider");
  return ctx;
};
