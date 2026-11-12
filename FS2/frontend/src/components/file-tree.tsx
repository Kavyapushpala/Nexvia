"use client";

import { useState, useRef, useEffect } from "react";
import type { WorkspaceFile } from "@/hooks/use-workspace";

interface FileTreeProps {
  files: WorkspaceFile[];
  activeFile: string | null;
  onFileClick: (filename: string) => void;
  onCreateFile: (filename: string) => string | null;
  onRenameFile: (oldName: string, newName: string) => string | null;
  onDeleteFile: (filename: string) => void;
}

export function FileTree({
  files,
  activeFile,
  onFileClick,
  onCreateFile,
  onRenameFile,
  onDeleteFile,
}: FileTreeProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [newFileName, setNewFileName] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [renamingFile, setRenamingFile] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [renameError, setRenameError] = useState<string | null>(null);
  const createInputRef = useRef<HTMLInputElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isCreating) createInputRef.current?.focus();
  }, [isCreating]);

  useEffect(() => {
    if (renamingFile) renameInputRef.current?.focus();
  }, [renamingFile]);

  const handleCreate = () => {
    const error = onCreateFile(newFileName);
    if (error) {
      setCreateError(error);
      return;
    }
    setIsCreating(false);
    setNewFileName("");
    setCreateError(null);
  };

  const handleRename = () => {
    if (!renamingFile) return;
    const error = onRenameFile(renamingFile, renameValue);
    if (error) {
      setRenameError(error);
      return;
    }
    setRenamingFile(null);
    setRenameValue("");
    setRenameError(null);
  };

  const cancelCreate = () => {
    setIsCreating(false);
    setNewFileName("");
    setCreateError(null);
  };

  const cancelRename = () => {
    setRenamingFile(null);
    setRenameValue("");
    setRenameError(null);
  };

  return (
    <div className="flex h-full w-56 flex-col border-r border-zinc-800/60 bg-zinc-900/50">
      <div className="flex items-center justify-between px-3 py-2">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500">
          Explorer
        </span>
        <button
          onClick={() => {
            setIsCreating(true);
            setCreateError(null);
          }}
          className="cursor-pointer rounded p-1 text-zinc-600 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
          title="New file"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <line x1="8" y1="3" x2="8" y2="13" />
            <line x1="3" y1="8" x2="13" y2="8" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pt-1">
        {isCreating && (
          <div className="px-2 py-1">
            <input
              ref={createInputRef}
              value={newFileName}
              onChange={(e) => {
                setNewFileName(e.target.value);
                setCreateError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreate();
                if (e.key === "Escape") cancelCreate();
              }}
              onBlur={() => {
                if (!newFileName.trim()) cancelCreate();
                else handleCreate();
              }}
              placeholder="filename.ext"
              className="w-full rounded border border-zinc-700 bg-zinc-800/80 px-2 py-1 text-[13px] text-zinc-200 outline-none focus:border-blue-500/60"
            />
            {createError && (
              <p className="mt-1 text-xs text-red-400">{createError}</p>
            )}
          </div>
        )}

        {files.map((file) => (
          <div
            key={file.name}
            className={`group flex items-center gap-1 px-2 py-[3px] cursor-pointer ${
              activeFile === file.name
                ? "bg-zinc-800/70 text-zinc-100"
                : "text-zinc-400 hover:bg-zinc-800/40 hover:text-zinc-300"
            }`}
          >
            {renamingFile === file.name ? (
              <div className="flex-1">
                <input
                  ref={renameInputRef}
                  value={renameValue}
                  onChange={(e) => {
                    setRenameValue(e.target.value);
                    setRenameError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleRename();
                    if (e.key === "Escape") cancelRename();
                  }}
                  onBlur={handleRename}
                  className="w-full rounded border border-zinc-600 bg-zinc-800 px-1 py-0.5 text-sm text-zinc-200 outline-none focus:border-zinc-400"
                />
                {renameError && (
                  <p className="mt-1 text-xs text-red-400">{renameError}</p>
                )}
              </div>
            ) : (
              <>
                <button
                  onClick={() => onFileClick(file.name)}
                  className="flex-1 cursor-pointer truncate text-left text-[13px]"
                >
                  {file.name}
                </button>
                <div className="flex gap-0.5 opacity-0 group-hover:opacity-100">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setRenamingFile(file.name);
                      setRenameValue(file.name);
                      setRenameError(null);
                    }}
                    className="cursor-pointer rounded p-0.5 text-zinc-500 hover:bg-zinc-700 hover:text-zinc-300"
                    title="Rename"
                  >
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 16 16"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M11 2l3 3-9 9H2v-3z" />
                    </svg>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteFile(file.name);
                    }}
                    className="cursor-pointer rounded p-0.5 text-zinc-500 hover:bg-zinc-700 hover:text-red-400"
                    title="Delete"
                  >
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 16 16"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <line x1="4" y1="4" x2="12" y2="12" />
                      <line x1="12" y1="4" x2="4" y2="12" />
                    </svg>
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
