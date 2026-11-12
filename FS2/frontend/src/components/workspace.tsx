"use client";

import { useWorkspace } from "@/hooks/use-workspace";
import { detectLanguage } from "@/lib/language-detection";
import { ConnectionStatusIndicator } from "./connection-status";
import { Editor } from "./editor";
import { FileTabs } from "./file-tabs";
import { FileTree } from "./file-tree";

interface WorkspaceProps {
  workspaceId: string;
}

export function Workspace({ workspaceId }: WorkspaceProps) {
  const {
    files,
    openFiles,
    activeFile,
    status,
    awareness,
    getYText,
    createFile,
    renameFile,
    deleteFile,
    openFile,
    closeFile,
    setActiveFile,
  } = useWorkspace(workspaceId);

  const ytext = activeFile ? getYText(activeFile) : null;
  const language = activeFile ? detectLanguage(activeFile) : "javascript";

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-1 overflow-hidden">
        <FileTree
          files={files}
          activeFile={activeFile}
          onFileClick={openFile}
          onCreateFile={createFile}
          onRenameFile={renameFile}
          onDeleteFile={deleteFile}
        />

        <div className="flex flex-1 flex-col overflow-hidden">
          <FileTabs
            openFiles={openFiles}
            activeFile={activeFile}
            onTabClick={setActiveFile}
            onTabClose={closeFile}
          />

          <div className="flex-1 overflow-hidden">
            {activeFile && ytext && awareness ? (
              <Editor
                key={activeFile}
                ytext={ytext}
                awareness={awareness}
                language={language}
              />
            ) : (
              <div className="flex h-full items-center justify-center text-zinc-600">
                {files.length === 0
                  ? "Connecting to workspace..."
                  : "Select a file to start editing"}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-row-reverse items-center justify-between border-t border-zinc-800/60 bg-zinc-900/30 px-3 py-1">
        <ConnectionStatusIndicator status={status} />
        <span className="text-[11px] text-zinc-600 font-mono">{workspaceId}</span>
      </div>
    </div>
  );
}
