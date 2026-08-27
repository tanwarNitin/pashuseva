"use client";

import { useState, useTransition } from "react";
import { Switch } from "@/components/ui/switch";
import { toggleDutyStatus } from "@/actions/vet-actions";

interface DutyToggleProps {
  initialIsOnDuty: boolean;
}

export function DutyToggle({ initialIsOnDuty }: DutyToggleProps) {
  const [isOnDuty, setIsOnDuty] = useState(initialIsOnDuty);
  const [isPending, startTransition] = useTransition();
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  function handleToggle(checked: boolean) {
    // Optimistic update
    setIsOnDuty(checked);

    startTransition(async () => {
      const result = await toggleDutyStatus(checked);
      if (!result.success) {
        // Revert on failure
        setIsOnDuty(!checked);
        showToast(result.error ?? "Failed to update status", "error");
      } else {
        showToast(
          checked ? "You are now ON DUTY" : "You are now OFF DUTY",
          "success"
        );
      }
    });
  }

  function showToast(message: string, type: "success" | "error") {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }

  return (
    <div className="relative">
      {/* Duty Toggle Card */}
      <div
        className={`
          relative overflow-hidden rounded-2xl border-2 p-5 transition-all duration-500
          ${
            isOnDuty
              ? "border-emerald-500/40 bg-gradient-to-br from-emerald-950/80 via-emerald-900/40 to-emerald-950/60"
              : "border-slate-700/40 bg-gradient-to-br from-slate-900/80 via-slate-800/40 to-slate-900/60"
          }
        `}
      >
        {/* Animated glow behind when on duty */}
        {isOnDuty && (
          <div className="absolute inset-0 bg-emerald-500/5 animate-pulse pointer-events-none" />
        )}

        <div className="relative flex items-center justify-between gap-4">
          {/* Status indicator */}
          <div className="flex items-center gap-3">
            {/* Glowing dot */}
            <div className="relative">
              <div
                className={`
                  h-4 w-4 rounded-full transition-all duration-500
                  ${isOnDuty ? "bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.7)]" : "bg-slate-500"}
                `}
              />
              {isOnDuty && (
                <div className="absolute inset-0 h-4 w-4 rounded-full bg-emerald-400 animate-ping opacity-30" />
              )}
            </div>

            {/* Status text */}
            <div>
              <p
                className={`
                  text-base font-bold tracking-wide transition-colors duration-300
                  ${isOnDuty ? "text-emerald-300" : "text-slate-400"}
                `}
              >
                {isOnDuty ? "ON DUTY" : "OFF DUTY"}
              </p>
              <p
                className={`
                  text-xs transition-colors duration-300
                  ${isOnDuty ? "text-emerald-400/70" : "text-slate-500"}
                `}
              >
                {isOnDuty
                  ? "Ready for Emergency Calls"
                  : "Not visible to farmers"}
              </p>
            </div>
          </div>

          {/* Switch */}
          <Switch
            checked={isOnDuty}
            onCheckedChange={handleToggle}
            disabled={isPending}
            className={`
              !h-7 !w-14 transition-all duration-300
              ${isOnDuty
                ? "!bg-emerald-500 hover:!bg-emerald-400"
                : "!bg-slate-600 hover:!bg-slate-500"
              }
            `}
            aria-label="Toggle duty status"
          />
        </div>
      </div>

      {/* Toast notification */}
      {toast && (
        <div
          className={`
            fixed bottom-6 left-1/2 -translate-x-1/2 z-50
            animate-in slide-in-from-bottom-5 fade-in duration-300
            rounded-xl px-5 py-3 text-sm font-medium shadow-2xl
            ${
              toast.type === "success"
                ? "bg-emerald-600 text-white"
                : "bg-red-600 text-white"
            }
          `}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}
