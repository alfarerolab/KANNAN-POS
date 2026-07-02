import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, value, onChange, onBlur, ...props }, ref) => {
    // Estado derivado para permitir vaciar inputs numéricos sin que React los fuerce a "0" instantáneamente
    const [localValue, setLocalValue] = React.useState<string | number | readonly string[] | undefined>(value);
    const [lastValue, setLastValue] = React.useState(value);

    if (type === "number" && value !== lastValue) {
      setLastValue(value);
      const numValue = Number(value);
      const localNum = Number(localValue);
      const stringLocal = String(localValue ?? "");

      // Si el cambio de valor desde el padre numéricamente coincide con lo que el usuario está escribiendo
      // (ej: tipeó "" -> es 0, tipeó "0." -> es 0), no sobrescribimos su escritura.
      const isTypingEquivalent =
        numValue === localNum ||
        (numValue === 0 && (stringLocal === "" || stringLocal === "-" || stringLocal === "." || stringLocal === "-."));

      if (!isTypingEquivalent) {
        setLocalValue(value);
      }
    } else if (type !== "number" && value !== lastValue) {
      setLastValue(value);
      setLocalValue(value);
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (type === "number") {
        setLocalValue(e.target.value);
      }
      if (onChange) {
        onChange(e);
      }
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      if (type === "number") {
        setLocalValue(value); // Resincronizar formato al perder el foco
      }
      if (onBlur) {
        onBlur(e);
      }
    };

    const displayValue = type === "number" && value !== undefined ? (localValue ?? "") : value;

    return (
      <input
        type={type}
        className={cn(
          "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className
        )}
        ref={ref}
        value={displayValue}
        onChange={handleChange}
        onBlur={handleBlur}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
