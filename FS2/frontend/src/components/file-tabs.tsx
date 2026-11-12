"use client";

interface FileTabsProps {
  openFiles: string[];
  activeFile: string | null;
  onTabClick: (filename: string) => void;
  onTabClose: (filename: string) => void;
}

export function FileTabs({
  openFiles,
  activeFile,
  onTabClick,
  onTabClose,
}: FileTabsProps) {
  if (openFiles.length === 0) return null;

  return (
    <div className="flex bg-zinc-900/50">
      {openFiles.map((file) => (
        <button
          key={file}
          onClick={() => onTabClick(file)}
          className={`group relative flex cursor-pointer items-center gap-2 px-3 py-1.5 text-[13px] transition-colors ${
            activeFile === file
              ? "bg-zinc-950 text-zinc-200"
              : "text-zinc-500 hover:text-zinc-400"
          }`}
        >
          {activeFile === file && (
            <span className="absolute inset-x-0 top-0 h-px bg-blue-500/70" />
          )}
          <span className="truncate max-w-[140px]">{file}</span>
          <span
            onClick={(e) => {
              e.stopPropagation();
              onTabClose(file);
            }}
            className="cursor-pointer rounded p-0.5 opacity-0 transition-opacity hover:bg-zinc-700 group-hover:opacity-100"
          >
            <svg
              width="10"
              height="10"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <line x1="4" y1="4" x2="12" y2="12" />
              <line x1="12" y1="4" x2="4" y2="12" />
            </svg>
          </span>
        </button>
      ))}
    </div>
  );
}
