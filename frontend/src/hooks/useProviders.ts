import { useState, useEffect, useCallback } from "react";
import type { Provider, SelectedModel } from "../types";
import { fetchProviders } from "../api/client";

const STORAGE_KEY = "ensetai_selected_model";
const MODEL_MODES = new Set(["light", "flash", "normal", "complex"]);

function loadStored(): SelectedModel | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SelectedModel) : null;
  } catch {
    return null;
  }
}

function saveStored(sel: SelectedModel) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sel));
}

// The provider list is behind auth (it reveals which keys are configured),
// so it can only be fetched once the user is signed in.
export function useProviders(isAuthenticated: boolean) {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [selected, setSelected] = useState<SelectedModel | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await fetchProviders();
      setProviders(data);

      const stored = loadStored();
      const stillValid =
        stored &&
        MODEL_MODES.has(stored.provider) &&
        stored.model === stored.provider;

      if (stillValid && stored) {
        setSelected(stored);
      } else {
        const sel = { provider: "normal", model: "normal" };
        setSelected(sel);
        saveStored(sel);
      }
    } catch (e) {
      console.error("Failed to load providers:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      setProviders([]);
      setSelected(null);
      setLoading(false);
      return;
    }
    refresh();
  }, [refresh, isAuthenticated]);

  function select(provider: string, model: string) {
    const sel = { provider, model };
    setSelected(sel);
    saveStored(sel);
  }

  const currentProvider =
    providers.find((p) => p.id === selected?.provider) ?? null;
  const currentModel =
    currentProvider?.models.find((m) => m.id === selected?.model) ?? null;

  return {
    providers,
    selected,
    loading,
    select,
    currentProvider,
    currentModel,
    refresh,
  };
}
