import { supabase } from "@/integrations/supabase/client";

const GATE_KEY = "gatekeeper_authorized";
const GATE_REFERRAL_KEY = "gatekeeper_referral_code";

function normalizeReferralCode(code: string | null): string | null {
  const normalized = code?.trim().toUpperCase();
  return normalized ? normalized : null;
}

export function activateGate(referralCode?: string): void {
  localStorage.setItem(GATE_KEY, "true");

  if (referralCode) {
    localStorage.setItem(GATE_REFERRAL_KEY, referralCode);
  }
}

export function clearGate(): void {
  localStorage.removeItem(GATE_KEY);
  localStorage.removeItem(GATE_REFERRAL_KEY);
}

export function getStoredReferralCode(): string | null {
  return normalizeReferralCode(localStorage.getItem(GATE_REFERRAL_KEY));
}

export function isGateOpen(): boolean {
  return localStorage.getItem(GATE_KEY) === "true" && !!getStoredReferralCode();
}

export function checkGate(searchParams: URLSearchParams): boolean {
  const queryReferralCode = normalizeReferralCode(searchParams.get("ref"));

  if (queryReferralCode) {
    return queryReferralCode === getStoredReferralCode() && isGateOpen();
  }

  return isGateOpen();
}

async function isReferralCodeActive(code: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("referral_codes")
    .select("id")
    .eq("code", code)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    console.error("Referral code validation failed:", error);
    return false;
  }

  return !!data;
}

export async function resolveGateAccess(searchParams: URLSearchParams): Promise<boolean> {
  const queryReferralCode = normalizeReferralCode(searchParams.get("ref"));
  const referralCodeToValidate = queryReferralCode ?? getStoredReferralCode();

  if (!referralCodeToValidate) {
    clearGate();
    return false;
  }

  const isActive = await isReferralCodeActive(referralCodeToValidate);

  if (!isActive) {
    clearGate();
    return false;
  }

  activateGate(referralCodeToValidate);
  return true;
}
