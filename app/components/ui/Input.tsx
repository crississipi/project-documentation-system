"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/cn";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className, id, ...props }, ref) => {
    const inputId = id ?? label.toLowerCase().replace(/\s+/g, "-");
    return (
      <div className="w-full">
        <div
          className={cn(
            "group w-full rounded-lg border py-3 px-5 relative transition-colors",
            error
              ? "border-red-400 focus-within:border-red-500"
              : "border-gray-300 focus-within:border-violet-600 has-[input:not(:placeholder-shown)]:border-violet-600"
          )}
        >
          <input
            ref={ref}
            id={inputId}
            className={cn(
              "peer w-full bg-transparent outline-none text-black placeholder-transparent text-sm",
              className
            )}
            placeholder={label}
            {...props}
          />
          <label
            htmlFor={inputId}
            className={cn(
              "absolute left-3 bg-white px-1 text-sm transition-all pointer-events-none",
              error
                ? "text-red-500 -top-2.5"
                : "text-violet-600 -top-2.5 peer-placeholder-shown:top-3 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-focus:-top-2.5 peer-focus:text-sm peer-focus:text-violet-600"
            )}
          >
            {label}
          </label>
        </div>
        {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
      </div>
    );
  }
);

Input.displayName = "Input";
