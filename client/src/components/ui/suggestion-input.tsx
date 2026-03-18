import * as React from "react"
import { cn } from "@/lib/utils"

interface SuggestionInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  suggestion?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const SuggestionInput = React.forwardRef<HTMLInputElement, SuggestionInputProps>(
  ({ className, suggestion, onChange, value, ...props }, ref) => {
    const innerRef = React.useRef<HTMLInputElement>(null);
    const combinedRef = (node: HTMLInputElement) => {
      innerRef.current = node;
      if (typeof ref === 'function') ref(node);
      else if (ref) (ref as React.MutableRefObject<HTMLInputElement | null>).current = node;
    };

    const currentValue = String(value ?? innerRef.current?.value ?? '');
    const isEmpty = !currentValue;

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'ArrowRight' && isEmpty && suggestion && innerRef.current) {
        e.preventDefault();
        const setter = Object.getOwnPropertyDescriptor(
          window.HTMLInputElement.prototype, 'value'
        )?.set;
        setter?.call(innerRef.current, suggestion);
        innerRef.current.dispatchEvent(new Event('input', { bubbles: true }));
      }
      props.onKeyDown?.(e);
    };

    return (
      <input
        {...props}
        value={value}
        onChange={onChange}
        onKeyDown={handleKeyDown}
        placeholder={suggestion}
        ref={combinedRef}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
      />
    )
  }
)
SuggestionInput.displayName = "SuggestionInput"

interface SuggestionTextareaProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange'> {
  suggestion?: string;
  onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
}

const SuggestionTextarea = React.forwardRef<HTMLTextAreaElement, SuggestionTextareaProps>(
  ({ className, suggestion, onChange, value, ...props }, ref) => {
    const innerRef = React.useRef<HTMLTextAreaElement>(null);
    const combinedRef = (node: HTMLTextAreaElement) => {
      innerRef.current = node;
      if (typeof ref === 'function') ref(node);
      else if (ref) (ref as React.MutableRefObject<HTMLTextAreaElement | null>).current = node;
    };

    const currentValue = String(value ?? innerRef.current?.value ?? '');
    const isEmpty = !currentValue;

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'ArrowRight' && isEmpty && suggestion && innerRef.current) {
        e.preventDefault();
        const setter = Object.getOwnPropertyDescriptor(
          window.HTMLTextAreaElement.prototype, 'value'
        )?.set;
        setter?.call(innerRef.current, suggestion);
        innerRef.current.dispatchEvent(new Event('input', { bubbles: true }));
      }
      props.onKeyDown?.(e);
    };

    return (
      <textarea
        {...props}
        value={value}
        onChange={onChange}
        onKeyDown={handleKeyDown}
        placeholder={suggestion}
        ref={combinedRef}
        className={cn(
          "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
      />
    )
  }
)
SuggestionTextarea.displayName = "SuggestionTextarea"

export { SuggestionInput, SuggestionTextarea }
