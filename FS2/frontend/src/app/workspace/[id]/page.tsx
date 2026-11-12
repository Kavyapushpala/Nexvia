"use client";

import { use } from "react";
import { Workspace } from "@/components/workspace";

interface WorkspacePageProps {
  params: Promise<{ id: string }>;
}

export default function WorkspacePage({ params }: WorkspacePageProps) {
  const { id } = use(params);

  return (
    <div className="flex h-screen flex-col bg-zinc-950 text-zinc-50">
      <main className="flex-1 overflow-hidden">
        <Workspace workspaceId={id} />
      </main>
    </div>
  );
}
