import { Extension } from "@codemirror/state";
import { javascript } from "@codemirror/lang-javascript";
import { python } from "@codemirror/lang-python";
import { html } from "@codemirror/lang-html";
import { css } from "@codemirror/lang-css";
import { json, jsonParseLinter } from "@codemirror/lang-json";
import { markdown } from "@codemirror/lang-markdown";
import { rust } from "@codemirror/lang-rust";
import { java } from "@codemirror/lang-java";
import { cpp } from "@codemirror/lang-cpp";
import { go } from "@codemirror/lang-go";
import { sql } from "@codemirror/lang-sql";
import { linter, lintGutter, Diagnostic } from "@codemirror/lint";
import * as acorn from "acorn";

function jsLinter(sourceType: "script" | "module" = "module") {
  return linter((view) => {
    const code = view.state.doc.toString();
    if (!code.trim()) return [];

    const diagnostics: Diagnostic[] = [];
    try {
      acorn.parse(code, {
        ecmaVersion: "latest",
        sourceType,
        locations: true,
      });
    } catch (e) {
      if (e instanceof SyntaxError) {
        const err = e as SyntaxError & { pos?: number };
        const pos = err.pos ?? 0;
        diagnostics.push({
          from: pos,
          to: pos,
          severity: "error",
          message: err.message.replace(/\s*\(\d+:\d+\)$/, ""),
        });
      }
    }
    return diagnostics;
  });
}

function jsonLinter() {
  return linter(jsonParseLinter());
}

function cssLinter() {
  return linter((view) => {
    const code = view.state.doc.toString();
    if (!code.trim()) return [];

    const diagnostics: Diagnostic[] = [];
    let braces = 0;
    let inString = false;
    let stringChar = "";

    for (let i = 0; i < code.length; i++) {
      const ch = code[i];

      if (inString) {
        if (ch === stringChar && code[i - 1] !== "\\") inString = false;
        continue;
      }

      if (ch === '"' || ch === "'") {
        inString = true;
        stringChar = ch;
      } else if (ch === "{") {
        braces++;
      } else if (ch === "}") {
        braces--;
        if (braces < 0) {
          diagnostics.push({
            from: i,
            to: i + 1,
            severity: "error",
            message: "Unexpected closing brace",
          });
          return diagnostics;
        }
      }
    }

    if (braces > 0) {
      diagnostics.push({
        from: code.length,
        to: code.length,
        severity: "error",
        message: `${braces} unclosed brace${braces > 1 ? "s" : ""}`,
      });
    }

    return diagnostics;
  });
}

export interface LangConfig {
  label: string;
  ext: () => Extension[];
}

export const LANGUAGES: Record<string, LangConfig> = {
  javascript: {
    label: "JavaScript",
    ext: () => [javascript({ jsx: true }), jsLinter(), lintGutter()],
  },
  typescript: {
    label: "TypeScript",
    ext: () => [
      javascript({ jsx: true, typescript: true }),
      jsLinter(),
      lintGutter(),
    ],
  },
  python: { label: "Python", ext: () => [python()] },
  html: { label: "HTML", ext: () => [html()] },
  css: { label: "CSS", ext: () => [css(), cssLinter(), lintGutter()] },
  json: { label: "JSON", ext: () => [json(), jsonLinter(), lintGutter()] },
  markdown: { label: "Markdown", ext: () => [markdown()] },
  rust: { label: "Rust", ext: () => [rust()] },
  java: { label: "Java", ext: () => [java()] },
  cpp: { label: "C/C++", ext: () => [cpp()] },
  go: { label: "Go", ext: () => [go()] },
  sql: { label: "SQL", ext: () => [sql()] },
};

export type LanguageKey = keyof typeof LANGUAGES;

const EXTENSION_MAP: Record<string, LanguageKey> = {
  ".js": "javascript",
  ".jsx": "javascript",
  ".ts": "typescript",
  ".tsx": "typescript",
  ".py": "python",
  ".html": "html",
  ".htm": "html",
  ".css": "css",
  ".json": "json",
  ".md": "markdown",
  ".rs": "rust",
  ".java": "java",
  ".c": "cpp",
  ".cpp": "cpp",
  ".h": "cpp",
  ".hpp": "cpp",
  ".go": "go",
  ".sql": "sql",
};

export function detectLanguage(filename: string): LanguageKey {
  const dotIndex = filename.lastIndexOf(".");
  if (dotIndex === -1) return "javascript";

  const ext = filename.slice(dotIndex).toLowerCase();
  return EXTENSION_MAP[ext] ?? "javascript";
}
