"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import * as Y from "yjs";
import { Awareness } from "y-protocols/awareness";
import { CollabProvider, ConnectionStatus } from "@/lib/collab-provider";
import { detectLanguage } from "@/lib/language-detection";

const COLORS = [
  "#30bced",
  "#6eeb83",
  "#ffbc42",
  "#ecd444",
  "#ee6352",
  "#9ac2c9",
  "#8acb88",
  "#1be7ff",
];

const NAMES = [
  "Anonymous Panda",
  "Anonymous Fox",
  "Anonymous Owl",
  "Anonymous Cat",
  "Anonymous Wolf",
  "Anonymous Bear",
];

function getRandomColor() {
  return COLORS[Math.floor(Math.random() * COLORS.length)];
}

function getRandomName() {
  return NAMES[Math.floor(Math.random() * NAMES.length)];
}

const FILENAME_REGEX = /^[a-zA-Z0-9_\-][a-zA-Z0-9_\-. ]*$/;

export interface WorkspaceFile {
  name: string;
  language: string;
}

export interface UseWorkspaceReturn {
  files: WorkspaceFile[];
  openFiles: string[];
  activeFile: string | null;
  status: ConnectionStatus;
  awareness: Awareness | null;
  getYText: (filename: string) => Y.Text | null;
  createFile: (filename: string) => string | null;
  renameFile: (oldName: string, newName: string) => string | null;
  deleteFile: (filename: string) => void;
  openFile: (filename: string) => void;
  closeFile: (filename: string) => void;
  setActiveFile: (filename: string) => void;
}

export function useWorkspace(workspaceId: string): UseWorkspaceReturn {
  const [files, setFiles] = useState<WorkspaceFile[]>([]);
  const [openFiles, setOpenFiles] = useState<string[]>([]);
  const [activeFile, setActiveFileState] = useState<string | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const [awareness, setAwareness] = useState<Awareness | null>(null);

  const ydocRef = useRef<Y.Doc | null>(null);
  const awarenessRef = useRef<Awareness | null>(null);
  const filesMapRef = useRef<Y.Map<{ language: string }> | null>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    const ydoc = new Y.Doc();
    const awarenesInst = new Awareness(ydoc);

    const color = getRandomColor();
    awarenesInst.setLocalStateField("user", {
      name: getRandomName(),
      color,
      colorLight: color + "80",
    });

    ydocRef.current = ydoc;
    awarenessRef.current = awarenesInst;
    setAwareness(awarenesInst);

    const filesMap = ydoc.getMap<{ language: string }>("files");
    filesMapRef.current = filesMap;

    const syncFiles = () => {
      const entries: WorkspaceFile[] = [];
      filesMap.forEach((meta, name) => {
        entries.push({ name, language: meta.language });
      });
      entries.sort((a, b) => a.name.localeCompare(b.name));
      setFiles(entries);
    };

    filesMap.observe(syncFiles);

    const wsUrl = `ws://localhost:8080/ws/${workspaceId}`;
    const provider = new CollabProvider(wsUrl, ydoc, awarenesInst);

    const unsubscribe = provider.onStatusChange((newStatus) => {
      setStatus(newStatus);
    });

    const onSync = () => {
      if (initializedRef.current) return;
      initializedRef.current = true;

      if (filesMap.size === 0) {
        filesMap.set("main.js", { language: "javascript" });
      }

      syncFiles();

      const firstFile = filesMap.has("main.js")
        ? "main.js"
        : filesMap.keys().next().value;
      if (firstFile) {
        setOpenFiles([firstFile]);
        setActiveFileState(firstFile);
      }
    };

    const checkSync = provider.onStatusChange((s) => {
      if (s === "connected") {
        setTimeout(onSync, 100);
      }
    });

    return () => {
      unsubscribe();
      checkSync();
      filesMap.unobserve(syncFiles);
      provider.destroy();
      awarenesInst.destroy();
      ydoc.destroy();
      ydocRef.current = null;
      awarenessRef.current = null;
      filesMapRef.current = null;
      initializedRef.current = false;
      setAwareness(null);
    };
  }, [workspaceId]);

  useEffect(() => {
    const filesMap = filesMapRef.current;
    if (!filesMap) return;

    const handleFileDeleted = (
      event: Y.YMapEvent<{ language: string }>
    ) => {
      event.keysChanged.forEach((key) => {
        const change = event.changes.keys.get(key);
        if (change?.action === "delete") {
          setOpenFiles((prev) => {
            const next = prev.filter((f) => f !== key);
            setActiveFileState((active) => {
              if (active !== key) return active;
              const idx = prev.indexOf(key);
              return next[Math.min(idx, next.length - 1)] ?? null;
            });
            return next;
          });
        }
      });
    };

    filesMap.observe(handleFileDeleted);
    return () => filesMap.unobserve(handleFileDeleted);
  }, [workspaceId]);

  const getYText = useCallback((filename: string): Y.Text | null => {
    if (!ydocRef.current) return null;
    return ydocRef.current.getText("file:" + filename);
  }, []);

  const createFile = useCallback((filename: string): string | null => {
    const trimmed = filename.trim();
    if (!trimmed) return "File name cannot be empty";
    if (!FILENAME_REGEX.test(trimmed))
      return "Invalid characters in file name";
    if (filesMapRef.current?.has(trimmed))
      return "A file with this name already exists";

    const language = detectLanguage(trimmed);
    filesMapRef.current?.set(trimmed, { language });

    setOpenFiles((prev) =>
      prev.includes(trimmed) ? prev : [...prev, trimmed]
    );
    setActiveFileState(trimmed);

    return null;
  }, []);

  const renameFile = useCallback(
    (oldName: string, newName: string): string | null => {
      const trimmed = newName.trim();
      if (!trimmed) return "File name cannot be empty";
      if (!FILENAME_REGEX.test(trimmed))
        return "Invalid characters in file name";
      if (oldName === trimmed) return null;
      if (filesMapRef.current?.has(trimmed))
        return "A file with this name already exists";

      const ydoc = ydocRef.current;
      const filesMap = filesMapRef.current;
      if (!ydoc || !filesMap) return "Workspace not ready";

      const oldText = ydoc.getText("file:" + oldName);
      const content = oldText.toString();
      const language = detectLanguage(trimmed);

      ydoc.transact(() => {
        filesMap.delete(oldName);
        filesMap.set(trimmed, { language });
        const newText = ydoc.getText("file:" + trimmed);
        if (content) {
          newText.insert(0, content);
        }
      });

      setOpenFiles((prev) =>
        prev.map((f) => (f === oldName ? trimmed : f))
      );
      setActiveFileState((prev) => (prev === oldName ? trimmed : prev));

      return null;
    },
    []
  );

  const deleteFile = useCallback((filename: string) => {
    filesMapRef.current?.delete(filename);

    setOpenFiles((prev) => {
      const next = prev.filter((f) => f !== filename);
      setActiveFileState((active) => {
        if (active !== filename) return active;
        const idx = prev.indexOf(filename);
        return next[Math.min(idx, next.length - 1)] ?? null;
      });
      return next;
    });
  }, []);

  const openFile = useCallback((filename: string) => {
    setOpenFiles((prev) =>
      prev.includes(filename) ? prev : [...prev, filename]
    );
    setActiveFileState(filename);
  }, []);

  const closeFile = useCallback((filename: string) => {
    setOpenFiles((prev) => {
      const next = prev.filter((f) => f !== filename);
      setActiveFileState((active) => {
        if (active !== filename) return active;
        const idx = prev.indexOf(filename);
        return next[Math.min(idx, next.length - 1)] ?? null;
      });
      return next;
    });
  }, []);

  const setActiveFile = useCallback((filename: string) => {
    setActiveFileState(filename);
    awarenessRef.current?.setLocalStateField("activeFile", filename);
  }, []);

  return {
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
  };
}
