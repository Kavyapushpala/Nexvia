"use client";

import { useEffect, useRef } from "react";
import * as Y from "yjs";
import { yCollab } from "y-codemirror.next";
import { Awareness } from "y-protocols/awareness";
import { EditorView, basicSetup } from "codemirror";
import { EditorState } from "@codemirror/state";
import { oneDark } from "@codemirror/theme-one-dark";
import { LANGUAGES, LanguageKey } from "@/lib/language-detection";

interface EditorProps {
  ytext: Y.Text;
  awareness: Awareness;
  language: LanguageKey;
}

export function Editor({ ytext, awareness, language }: EditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);

  useEffect(() => {
    if (!editorRef.current) return;

    const langConfig = LANGUAGES[language] ?? LANGUAGES["javascript"];

    const state = EditorState.create({
      doc: ytext.toString(),
      extensions: [
        basicSetup,
        oneDark,
        langConfig.ext(),
        yCollab(ytext, awareness),
        EditorView.theme({
          "&": { height: "100%" },
          ".cm-scroller": { overflow: "auto" },
        }),
      ],
    });

    const view = new EditorView({
      state,
      parent: editorRef.current,
    });
    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, [ytext, awareness, language]);

  return <div ref={editorRef} className="h-full overflow-hidden" />;
}
