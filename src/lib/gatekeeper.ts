const GATE_KEY = "gatekeeper_authorized";

export function activateGate(): void {
  sessionStorage.setItem(GATE_KEY, "true");
}

export function isGateOpen(): boolean {
  return sessionStorage.getItem(GATE_KEY) === "true";
}

/** Check URL param OR sessionStorage. If ?go=1 found, persist to sessionStorage. */
export function checkGate(searchParams: URLSearchParams): boolean {
  if (searchParams.get("go") === "1") {
    activateGate();
    return true;
  }
  return isGateOpen();
}
