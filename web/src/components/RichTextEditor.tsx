"use client";

import { useEffect, useRef } from "react";
import {
  Bold,
  Heading2,
  Italic,
  List,
  Quote,
  RemoveFormatting,
} from "lucide-react";

export default function RichTextEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (html: string) => void;
}) {
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value;
    }
  }, [value]);

  const exec = (command: string, arg?: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false, arg);
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  return (
    <div className="border border-slate-300 rounded-xl overflow-hidden bg-white focus-within:ring-2 focus-within:ring-brand-600">
      {/* Barra de herramientas estilo Tiptap / WordPress */}
      <div className="bg-slate-100 border-b border-slate-200 px-3 py-2 flex flex-wrap items-center gap-1">
        <button
          type="button"
          onClick={() => exec("bold")}
          className="p-2 rounded hover:bg-white text-slate-700 hover:text-brand-800 transition"
          title="Negrita"
        >
          <Bold className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => exec("italic")}
          className="p-2 rounded hover:bg-white text-slate-700 hover:text-brand-800 transition"
          title="Cursiva"
        >
          <Italic className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => exec("formatBlock", "H3")}
          className="p-2 rounded hover:bg-white text-slate-700 hover:text-brand-800 transition inline-flex items-center gap-1 text-xs font-bold"
          title="Subtítulo Periodístico"
        >
          <Heading2 className="w-4 h-4" /> Subtítulo
        </button>
        <button
          type="button"
          onClick={() => exec("formatBlock", "BLOCKQUOTE")}
          className="p-2 rounded hover:bg-white text-slate-700 hover:text-brand-800 transition inline-flex items-center gap-1 text-xs font-semibold"
          title="Cita destacada"
        >
          <Quote className="w-4 h-4" /> Cita
        </button>
        <button
          type="button"
          onClick={() => exec("insertUnorderedList")}
          className="p-2 rounded hover:bg-white text-slate-700 hover:text-brand-800 transition"
          title="Lista con viñetas"
        >
          <List className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => exec("removeFormat")}
          className="p-2 rounded hover:bg-white text-slate-500 hover:text-red-600 transition ml-auto"
          title="Limpiar formato"
        >
          <RemoveFormatting className="w-4 h-4" />
        </button>
      </div>

      {/* Área editable */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={(e) => onChange((e.target as HTMLDivElement).innerHTML)}
        className="min-h-[280px] p-4 text-base text-slate-800 leading-relaxed focus:outline-none article-content"
      />
    </div>
  );
}
