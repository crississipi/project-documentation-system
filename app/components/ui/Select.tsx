"use client";

import { forwardRef, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  options: SelectOption[];
  error?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      options,
      error,
      className,
      id,
      onChange,
      onBlur,
      name,
      defaultValue,
      value: controlledValue,
      ...props
    },
    ref
  ) => {
    const selectId = id ?? label.toLowerCase().replace(/\s+/g, "-");

    // Derive initial value: controlled > defaultValue > first option
    const initial =
      String(controlledValue ?? defaultValue ?? options[0]?.value ?? "");
    const [selected, setSelected] = useState(initial);
    const [open, setOpen] = useState(false);
    const [focusedIdx, setFocusedIdx] = useState(-1);

    const containerRef = useRef<HTMLDivElement>(null);
    const listRef = useRef<HTMLUListElement>(null);

    // Sync when controlled value changes externally
    useEffect(() => {
      if (controlledValue !== undefined) setSelected(String(controlledValue));
    }, [controlledValue]);

    const selectedLabel =
      options.find((o) => o.value === selected)?.label ?? selected;

    const pick = (val: string) => {
      setSelected(val);
      setOpen(false);
      setFocusedIdx(-1);
      // Fire react-hook-form compatible change event
      onChange?.({
        target: { value: val, name: name ?? "" },
      } as React.ChangeEvent<HTMLSelectElement>);
    };

    // Close on outside click
    useEffect(() => {
      const handler = (e: MouseEvent) => {
        if (!containerRef.current?.contains(e.target as Node)) {
          setOpen(false);
          setFocusedIdx(-1);
        }
      };
      document.addEventListener("mousedown", handler);
      return () => document.removeEventListener("mousedown", handler);
    }, []);

    // Scroll focused item into view
    useEffect(() => {
      if (open && focusedIdx >= 0) {
        listRef.current?.children[focusedIdx]?.scrollIntoView({
          block: "nearest",
        });
      }
    }, [focusedIdx, open]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (!open) {
        if (["Enter", " ", "ArrowDown", "ArrowUp"].includes(e.key)) {
          e.preventDefault();
          setOpen(true);
          setFocusedIdx(
            options.findIndex((o) => o.value === selected)
          );
        }
        return;
      }
      if (e.key === "Escape") { setOpen(false); setFocusedIdx(-1); }
      else if (e.key === "ArrowDown") {
        e.preventDefault();
        setFocusedIdx((i) => Math.min(i + 1, options.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setFocusedIdx((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        if (focusedIdx >= 0) pick(options[focusedIdx].value);
      }
    };

    return (
      <div className="w-full relative" ref={containerRef}>
        {/* Hidden native select keeps ref + name for react-hook-form */}
        <select
          ref={ref}
          name={name}
          value={selected}
          onChange={() => {}}
          onBlur={onBlur}
          tabIndex={-1}
          aria-hidden
          style={{ position: "absolute", opacity: 0, pointerEvents: "none", width: 0, height: 0 }}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value} />
          ))}
        </select>

        {/* Trigger */}
        <div
          id={selectId}
          role="combobox"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={`${selectId}-list`}
          tabIndex={0}
          onClick={() => {
            setOpen((v) => !v);
            if (!open)
              setFocusedIdx(options.findIndex((o) => o.value === selected));
          }}
          onKeyDown={handleKeyDown}
          className={cn(
            "relative w-full rounded-lg border py-3 px-5 cursor-pointer transition-colors select-none outline-none",
            open
              ? "border-violet-600 ring-1 ring-violet-200"
              : error
              ? "border-red-400"
              : "border-gray-300 hover:border-violet-400 focus:border-violet-600",
            className
          )}
        >
          {/* Floating label */}
          <span
            className={cn(
              "absolute left-3 bg-white px-1 text-xs pointer-events-none transition-all",
              error ? "text-red-500 -top-2.5" : open ? "text-violet-600 -top-2.5" : "-top-2.5 text-violet-600"
            )}
          >
            {label}
          </span>

          <span className="block text-sm text-slate-800 truncate pr-4">
            {selectedLabel}
          </span>

          {/* Chevron */}
          <span
            className={cn(
              "pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 transition-transform duration-200 text-slate-400",
              open && "rotate-180 text-violet-500"
            )}
          >
            <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
            </svg>
          </span>
        </div>

        {/* Dropdown panel */}
        {open && (
          <ul
            id={`${selectId}-list`}
            ref={listRef}
            role="listbox"
            className="absolute z-50 mt-1.5 w-full bg-white border border-slate-200 rounded-xl shadow-lg overflow-auto max-h-56 py-1"
          >
            {options.map((opt, i) => {
              const isSelected = opt.value === selected;
              const isFocused = i === focusedIdx;
              return (
                <li
                  key={opt.value}
                  role="option"
                  aria-selected={isSelected}
                  onMouseDown={(e) => { e.preventDefault(); pick(opt.value); }}
                  onMouseEnter={() => setFocusedIdx(i)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2.5 text-sm cursor-pointer transition-colors",
                    isSelected
                      ? "bg-violet-50 text-violet-700 font-medium"
                      : isFocused
                      ? "bg-slate-50 text-slate-900"
                      : "text-slate-700 hover:bg-slate-50"
                  )}
                >
                  {/* Check mark for selected */}
                  <span className={cn("w-4 h-4 flex-shrink-0", isSelected ? "text-violet-600" : "text-transparent")}>
                    <svg viewBox="0 0 16 16" fill="currentColor">
                      <path d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z" />
                    </svg>
                  </span>
                  {opt.label}
                </li>
              );
            })}
          </ul>
        )}

        {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
      </div>
    );
  }
);

Select.displayName = "Select";
