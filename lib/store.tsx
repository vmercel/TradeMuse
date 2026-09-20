/**
 * Shared app state: trading mode, guardrails, backend URL.
 * Provided at the root layout so every tab reads the same values.
 */

import { createContext, useContext, useState, type ReactNode } from "react";
import { defaultGuardrails } from "./mockData";
import { setBackendUrl } from "./api";
import type { Guardrails, Mode } from "./api";

interface AppState {
  mode: Mode;
  guardrails: Guardrails;
  backendUrl: string;
  liveRiskAcknowledged: boolean;
  setMode: (mode: Mode) => void;
  updateGuardrails: (patch: Partial<Guardrails>) => void;
  setBackendUrlValue: (url: string) => void;
  acknowledgeLiveRisk: () => void;
}

const AppStateContext = createContext<AppState | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<Mode>("paper");
  const [guardrails, setGuardrails] = useState<Guardrails>(defaultGuardrails);
  const [backendUrl, setBackendUrlState] = useState("");
  const [liveRiskAcknowledged, setLiveRiskAcknowledged] = useState(false);

  const setMode = (next: Mode) => {
    // Live mode can never be switched on from the phone alone.
    // The backend must enable it; until then the toggle stays inert.
    if (next === "live") return;
    setModeState(next);
  };

  const updateGuardrails = (patch: Partial<Guardrails>) => {
    setGuardrails((prev) => ({ ...prev, ...patch }));
  };

  const setBackendUrlValue = (url: string) => {
    setBackendUrlState(url);
    setBackendUrl(url);
  };

  const acknowledgeLiveRisk = () => setLiveRiskAcknowledged(true);

  return (
    <AppStateContext.Provider
      value={{
        mode,
        guardrails,
        backendUrl,
        liveRiskAcknowledged,
        setMode,
        updateGuardrails,
        setBackendUrlValue,
        acknowledgeLiveRisk,
      }}
    >
      {children}
    </AppStateContext.Provider>
  );
}

export function useAppState(): AppState {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error("useAppState must be used inside AppStateProvider");
  return ctx;
}
