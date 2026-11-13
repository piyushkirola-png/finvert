import { useQuery } from "@tanstack/react-query";
import { merchantOnboardingService } from "../services/merchantOnboardingService";

export const onboardingKeys = {
  all: ["merchantOnboarding"] as const,
  merchant: (id: string) => [...onboardingKeys.all, "merchant", id] as const,
  documents: (id: string) => [...onboardingKeys.all, "documents", id] as const,
  rates: (id: string) => [...onboardingKeys.all, "rates", id] as const,
  gateways: () => [...onboardingKeys.all, "gateways"] as const,
  ips: (id: string) => [...onboardingKeys.all, "ips", id] as const,
};

export const useOnboardingMerchant = (id: string) =>
  useQuery({
    queryKey: onboardingKeys.merchant(id),
    queryFn: () => merchantOnboardingService.getMerchant(id),
    enabled: !!id,
  });

export const useOnboardingDocuments = (id: string) =>
  useQuery({
    queryKey: onboardingKeys.documents(id),
    queryFn: () => merchantOnboardingService.getDocuments(id),
    enabled: !!id,
  });

export const useOnboardingRates = (id: string) =>
  useQuery({
    queryKey: onboardingKeys.rates(id),
    queryFn: () => merchantOnboardingService.getRates(id),
    enabled: !!id,
  });

export const useOnboardingGateways = () =>
  useQuery({
    queryKey: onboardingKeys.gateways(),
    queryFn: () => merchantOnboardingService.getGateways(),
  });

export const useOnboardingIPs = (id: string) =>
  useQuery({
    queryKey: onboardingKeys.ips(id),
    queryFn: () => merchantOnboardingService.getIPWhitelist(id),
    enabled: !!id,
  });
