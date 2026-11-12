"use client";

import { useRouter } from "next/navigation";
import { v4 as uuidv4 } from "uuid";

export default function Home() {
  const router = useRouter();

  function handleCreate() {
    const id = uuidv4();
    router.push(`/workspace/${id}`);
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-zinc-950 text-zinc-50">
      <div className="flex flex-col items-center gap-4">
        <h1 className="text-4xl font-bold tracking-tight">
          Collaborative Editor
        </h1>
        <p className="text-zinc-400">
          Real-time collaborative workspace powered by CRDTs
        </p>
      </div>
      <button
        onClick={handleCreate}
        className="rounded-lg bg-white px-6 py-3 text-lg font-medium text-zinc-950 transition-colors hover:bg-zinc-200"
      >
        New Workspace
      </button>
    </div>
  );
}
