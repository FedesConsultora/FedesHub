import React, { useMemo, useRef, useState } from "react";

export default function MentionInput({
  value,
  onChange,
  feders = [],
  disabled = false,
  placeholder = "Escribir…",
  className = "",
  inputRef = null,
  onPaste,
}) {
  const ref = inputRef || useRef(null);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);

  const idx = useMemo(
    () =>
      feders.map((f) => ({
        ...f,
        full: `${f?.nombre || ""} ${f?.apellido || ""}`.trim(),
        fullLower: `${f?.nombre || ""} ${f?.apellido || ""}`
          .trim()
          .toLowerCase(),
        emailLower: (f?.email || "").toLowerCase(),
      })),
    [feders]
  );

  const results = useMemo(() => {
    const qq = q.trim().toLowerCase();
    if (!qq) return [];
    const out = [];
    for (let i = 0; i < idx.length; i++) {
      const it = idx[i];
      if (it.fullLower.includes(qq) || it.emailLower.includes(qq)) {
        out.push(it);
        if (out.length >= 8) break;
      }
    }
    return out;
  }, [q, idx]);

  // 👉 ahora inserta "@Nombre Apellido "
  const insertToken = (f) => {
    const el = ref.current;
    if (!el) return;
    const start = el.selectionStart ?? value.length;
    const end = el.selectionEnd ?? value.length;

    const before = value.slice(0, start);
    const at = before.lastIndexOf("@");
    if (at < 0) return;
    const maybe = before.slice(at, start);
    if (!maybe.startsWith("@")) return;

    const left = value.slice(0, at);
    const right = value.slice(end);
    const display = `@${(f?.nombre || "") + " " + (f?.apellido || "")}`
      .replace(/\s+/g, " ")
      .trim();
    const token = `${display} `; // espacio para cerrar la mención
    const next = `${left}${token}${right}`;
    const pos = (left + token).length;

    onChange(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(pos, pos);
    });
    setOpen(false);
    setQ("");
    setSel(0);
  };

  const onInput = (e) => {
    const v = e.target.value;
    onChange(v);
    const pos = e.target.selectionStart;
    const left = v.slice(0, pos);
    const at = left.lastIndexOf("@");
    if (at >= 0) {
      const term = left.slice(at + 1);
      if (/^[^\s@]{0,40}$/.test(term)) {
        setQ(term);
        setOpen(true);
        setSel(0);
        return;
      }
    }
    setOpen(false);
    setQ("");
    setSel(0);
  };

  const onKeyDown = (e) => {
    if (open) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSel((s) => Math.min(s + 1, results.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSel((s) => Math.max(s - 1, 0));
      } else if (e.key === "Enter" || e.key === "Tab") {
        if (results[sel]) {
          e.preventDefault();
          insertToken(results[sel]);
          return;
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
        return;
      }
    }

    if (!open && e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();

      e.target.form?.requestSubmit();
    }
  };

  return (
    <div className={`mentionWrap ${className || ""}`}>
      <textarea
        ref={ref}
        className="mentionInput"
        value={value}
        onChange={onInput}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        onPaste={onPaste}
        wrap="soft"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
      />
      {open && !!results.length && (
        <div className="mentionPopover" role="listbox" aria-label="Menciones">
          {results.map((f, i) => (
            <button
              key={f.id}
              onMouseDown={(e) => {
                e.preventDefault();
                insertToken(f);
              }}
              className={`mentionItem ${i === sel ? "is-active" : ""}`}
              role="option"
              aria-selected={i === sel}
              title={f.email || ""}
            >
              <div className="nm">
                {f.full || `${f.nombre || ""} ${f.apellido || ""}`}
              </div>
              <div className="sub">{f.email || ""}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
