import { useState } from "react";
import { Modal } from "../components/ui/Modal";
import { Skeleton } from "../components/ui/Skeleton";
import { EmptyState } from "../components/ui/EmptyState";
import { Tooltip } from "../components/ui/Tooltip";
import { Popover } from "../components/ui/Popover";
import { Kbd } from "../components/ui/Kbd";
import { useToast } from "../components/ui/ToastProvider";

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border border-brand-gray dark:border-brand-navy-border rounded-2xl p-5 bg-white dark:bg-brand-navy">
      <h2 className="text-sm font-semibold text-brand-navy dark:text-white mb-4">
        {title}
      </h2>
      <div className="flex flex-wrap items-center gap-4">{children}</div>
    </section>
  );
}

export function PrimitivePlayground() {
  const [modalOpen, setModalOpen] = useState(false);
  const { toast, undo } = useToast();

  return (
    <div className="min-h-screen bg-brand-surface-muted dark:bg-brand-navy-light p-8 overflow-auto">
      <div className="max-w-4xl mx-auto space-y-6">
        <header>
          <h1 className="text-2xl font-display font-bold text-brand-navy dark:text-white">
            UI Primitives Playground
          </h1>
          <p className="text-sm text-brand-gray-text dark:text-white/50 mt-1">
            Visual smoke test for Phase 0 building blocks.
          </p>
        </header>

        <Section title="Kbd">
          <Kbd>⌘</Kbd>
          <Kbd>K</Kbd>
          <span className="text-xs text-brand-gray-text dark:text-white/40">
            opens command palette
          </span>
          <Kbd>?</Kbd>
          <span className="text-xs text-brand-gray-text dark:text-white/40">
            shortcuts cheatsheet
          </span>
        </Section>

        <Section title="Tooltip">
          <Tooltip label="Bonjour depuis floating-ui">
            <button className="px-3 py-2 rounded-lg bg-brand-blue text-white text-xs font-semibold">
              Hover or focus me
            </button>
          </Tooltip>
          <Tooltip label="Position bottom" placement="bottom">
            <button className="px-3 py-2 rounded-lg border border-brand-gray dark:border-brand-navy-border text-xs text-brand-navy dark:text-white">
              Bottom tooltip
            </button>
          </Tooltip>
        </Section>

        <Section title="Popover">
          <Popover
            trigger={
              <button className="px-3 py-2 rounded-lg bg-brand-gold text-brand-navy text-xs font-semibold">
                Open popover
              </button>
            }
          >
            {(close) => (
              <div className="p-4 w-64">
                <p className="text-xs font-semibold text-brand-navy dark:text-white">
                  Popover content
                </p>
                <p className="text-xs text-brand-gray-text dark:text-white/50 mt-1">
                  Closes on outside click, ESC, or via close prop.
                </p>
                <button
                  onClick={close}
                  className="mt-3 text-xs text-brand-blue hover:underline"
                >
                  Close
                </button>
              </div>
            )}
          </Popover>
        </Section>

        <Section title="Modal">
          <button
            onClick={() => setModalOpen(true)}
            className="px-3 py-2 rounded-lg bg-brand-navy dark:bg-brand-blue text-white text-xs font-semibold"
          >
            Open modal
          </button>
          <Modal
            open={modalOpen}
            onClose={() => setModalOpen(false)}
            title="Démo modale"
            description="Ferme avec ESC, clic en dehors, ou bouton ci-dessous"
            size="md"
          >
            <div className="p-5">
              <p className="text-sm text-brand-navy dark:text-white/80">
                Focus is trapped inside. Tab cycles through interactive
                children. Pressing Escape closes.
              </p>
              <div className="mt-5 flex justify-end gap-2">
                <button
                  onClick={() => setModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-brand-gray-text dark:text-white/60 hover:text-brand-navy dark:hover:text-white"
                >
                  Annuler
                </button>
                <button
                  onClick={() => setModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg bg-brand-blue text-white text-xs font-semibold"
                >
                  Confirmer
                </button>
              </div>
            </div>
          </Modal>
        </Section>

        <Section title="Toasts">
          <button
            onClick={() => toast("Enregistré avec succès", "success")}
            className="px-3 py-2 rounded-lg bg-green-600 text-white text-xs font-semibold"
          >
            Success
          </button>
          <button
            onClick={() => toast("Quelque chose a échoué", "error")}
            className="px-3 py-2 rounded-lg bg-red-600 text-white text-xs font-semibold"
          >
            Error
          </button>
          <button
            onClick={() =>
              toast("Document téléchargé", "info", {
                action: { label: "Ouvrir", onClick: () => alert("ouvert") },
              })
            }
            className="px-3 py-2 rounded-lg bg-brand-blue text-white text-xs font-semibold"
          >
            Info + action
          </button>
          <button
            onClick={() =>
              undo("Conversation supprimée", () => alert("restaurée"))
            }
            className="px-3 py-2 rounded-lg border border-brand-gray dark:border-brand-navy-border text-xs text-brand-navy dark:text-white"
          >
            Undo toast
          </button>
        </Section>

        <Section title="Skeleton">
          <div className="flex flex-col gap-3 w-full">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <div className="flex gap-3 items-center">
              <Skeleton className="h-10 w-10" rounded="full" />
              <div className="flex-1 flex flex-col gap-2">
                <Skeleton className="h-3 w-2/3" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            </div>
          </div>
        </Section>

        <Section title="EmptyState">
          <div className="w-full">
            <EmptyState
              illustration={
                <svg
                  className="w-20 h-20 text-brand-blue/50"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 17v-2a4 4 0 014-4h6m-6 0V9a4 4 0 00-4-4H3v12a2 2 0 002 2h6"
                  />
                </svg>
              }
              title="Aucune conversation"
              description="Démarrez une nouvelle discussion pour explorer vos documents."
              action={{
                label: "Nouvelle conversation",
                onClick: () => toast("Created", "success"),
              }}
            />
          </div>
        </Section>
      </div>
    </div>
  );
}
