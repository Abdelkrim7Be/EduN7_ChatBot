import { useState, useEffect, useCallback } from "react";
import type { Provider, SelectedModel } from "../types";
import { fetchProviders } from "../api/client";

const STORAGE_KEY = "edun7_selected_model";

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

export function useProviders() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [selected, setSelected] = useState<SelectedModel | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await fetchProviders();
      setProviders(data);

      const stored = loadStored();
      const isAuto = stored?.provider === "auto";
      const stillValid =
        isAuto ||
        (stored &&
          data.some(
            (p) =>
              p.id === stored.provider &&
              p.available &&
              p.models.some((m) => m.id === stored.model)
          ));

      if (stillValid && stored) {
        setSelected(stored);
      } else {
        const sel = { provider: "auto", model: "auto" };
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
    refresh();
  }, [refresh]);

  function select(provider: string, model: string) {
    const sel = { provider, model };
    setSelected(sel);
    saveStored(sel);
  }

  const currentProvider = providers.find((p) => p.id === selected?.provider) ?? null;
  const currentModel =
    currentProvider?.models.find((m) => m.id === selected?.model) ?? null;

  return { providers, selected, loading, select, currentProvider, currentModel, refresh };
}
