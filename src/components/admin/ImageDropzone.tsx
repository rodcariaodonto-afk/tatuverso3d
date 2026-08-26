import { useCallback, useEffect, useRef, useState } from "react";
import { Upload, Loader2, ClipboardPaste } from "lucide-react";
import { toast } from "sonner";

type Props = {
  /** Recebe os arquivos de imagem (arrastados, colados ou selecionados) */
  onFiles: (files: File[]) => void | Promise<void>;
  multiple?: boolean;
  /** Habilita o listener global de colar (Ctrl+V) */
  enablePaste?: boolean;
  busy?: boolean;
  label?: string;
  hint?: string;
  children?: React.ReactNode;
};

export function ImageDropzone({
  onFiles,
  multiple = false,
  enablePaste = true,
  busy = false,
  label = "Arraste a imagem aqui",
  hint = "ou cole com Ctrl+V • ou clique para escolher",
  children,
}: Props) {
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handle = useCallback(
    async (list: File[]) => {
      const imgs = list.filter((f) => f.type.startsWith("image/"));
      if (imgs.length === 0) {
        if (list.length > 0) toast.error("Apenas arquivos de imagem são aceitos.");
        return;
      }
      const picked = multiple ? imgs : imgs.slice(0, 1);
      if (picked.length > 1) setProgress(`Enviando ${picked.length} imagens…`);
      try {
        await onFiles(picked);
      } finally {
        setProgress(null);
      }
    },
    [multiple, onFiles],
  );

  useEffect(() => {
    if (!enablePaste) return;
    const onPaste = (e: ClipboardEvent) => {
      const items = Array.from(e.clipboardData?.items ?? []);
      const files = items
        .filter((i) => i.kind === "file")
        .map((i) => i.getAsFile())
        .filter((f): f is File => !!f && f.type.startsWith("image/"));
      if (files.length === 0) return;
      e.preventDefault();
      void handle(files);
    };
    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  }, [enablePaste, handle]);

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        setDragging(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        void handle(Array.from(e.dataTransfer.files ?? []));
      }}
      onClick={() => inputRef.current?.click()}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
      }}
      className={`cursor-pointer rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
        dragging ? "border-accent bg-accent/5" : "border-border hover:border-accent/60"
      }`}
    >
      {children}
      <div className="flex flex-col items-center gap-1 text-sm">
        {busy || progress ? (
          <Loader2 className="h-6 w-6 animate-spin text-accent" />
        ) : dragging ? (
          <ClipboardPaste className="h-6 w-6 text-accent" />
        ) : (
          <Upload className="h-6 w-6 text-muted-foreground" />
        )}
        <span className="font-medium">{progress ?? (busy ? "Enviando…" : label)}</span>
        {!busy && !progress && <span className="text-xs text-muted-foreground">{hint}</span>}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple={multiple}
        className="hidden"
        onClick={(e) => e.stopPropagation()}
        onChange={async (e) => {
          const files = Array.from(e.target.files ?? []);
          e.currentTarget.value = "";
          await handle(files);
        }}
      />
    </div>
  );
}
