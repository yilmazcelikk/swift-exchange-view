const GATE_KEY = "gatekeeper_authorized";

export function activateGate(): void {
  localStorage.setItem(GATE_KEY, "true");
}

export function isGateOpen(): boolean {
  return localStorage.getItem(GATE_KEY) === "true";
}

/** Check URL param OR localStorage. If ?go=1 found, persist to localStorage. */
export function checkGate(searchParams: URLSearchParams): boolean {
  if (searchParams.get("go") === "1") {
    activateGate();
    return true;
  }
  return isGateOpen();
}
