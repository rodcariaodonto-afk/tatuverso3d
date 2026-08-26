import { useEffect, useState } from "react";

type MoneyInputProps = {
  value: number | null;
  onChange: (value: number | null) => void;
  /** Permite deixar o campo vazio (retorna null). */
  allowEmpty?: boolean;
  className?: string;
  placeholder?: string;
  id?: string;
};

/** "19,90" | "19.90" → 19.9 ; "" → null */
export function parseMoney(raw: string): number | null {
  const cleaned = raw.replace(/\s/g, "").replace(",", ".").replace(/[^0-9.]/g, "");
  if (!cleaned) return null;
  const n = Number(cleaned);
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 100) / 100;
}

/** 19.9 → "19,90" */
export function formatMoney(value: number | null): string {
  if (value == null || Number.isNaN(value)) return "";
  return value.toFixed(2).replace(".", ",");
}

/** Mantém apenas dígitos, um separador decimal e no máximo 2 casas. */
function sanitizeTyping(raw: string): string {
  let out = raw.replace(/[^0-9.,]/g, "");
  const firstSep = out.search(/[.,]/);
  if (firstSep >= 0) {
    const head = out.slice(0, firstSep);
    const sep = out[firstSep] ?? ",";
    const tail = out.slice(firstSep + 1).replace(/[.,]/g, "").slice(0, 2);
    out = head + sep + tail;
  }
  return out;
}

export function MoneyInput({
  value,
  onChange,
  allowEmpty = false,
  className,
  placeholder,
  id,
}: MoneyInputProps) {
  const [text, setText] = useState(() => formatMoney(value));
  const [focused, setFocused] = useState(false);

  // Sincroniza quando o valor muda de fora (carregar produto, gerar variações…)
  useEffect(() => {
    if (!focused) setText(formatMoney(value));
  }, [value, focused]);

  return (
    <input
      id={id}
      type="text"
      inputMode="decimal"
      autoComplete="off"
      className={className}
      placeholder={placeholder}
      value={text}
      onFocus={() => setFocused(true)}
      onChange={(e) => {
        const next = sanitizeTyping(e.target.value);
        setText(next);
        const parsed = parseMoney(next);
        if (parsed == null) {
          onChange(allowEmpty ? null : 0);
        } else {
          onChange(parsed);
        }
      }}
      onBlur={() => {
        setFocused(false);
        const parsed = parseMoney(text);
        if (parsed == null) {
          setText(allowEmpty ? "" : formatMoney(0));
          onChange(allowEmpty ? null : 0);
        } else {
          setText(formatMoney(parsed));
          onChange(parsed);
        }
      }}
    />
  );
}
