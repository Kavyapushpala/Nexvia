"use client";

import type { ConnectionStatus } from "@/lib/collab-provider";

const statusConfig: Record<
  ConnectionStatus,
  { color: string; label: string }
> = {
  connected: { color: "bg-green-500", label: "Connected" },
  connecting: { color: "bg-yellow-500", label: "Connecting..." },
  disconnected: { color: "bg-red-500", label: "Disconnected" },
};

interface ConnectionStatusProps {
  status: ConnectionStatus;
}

export function ConnectionStatusIndicator({ status }: ConnectionStatusProps) {
  const config = statusConfig[status];

  return (
    <div className="flex items-center gap-1.5 text-[11px] text-zinc-500">
      <span className={`w-1.5 h-1.5 rounded-full ${config.color}`} />
      {config.label}
    </div>
  );
}
