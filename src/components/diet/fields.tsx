import { useId, type ComponentProps, type ReactNode } from "react";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";

/**
 * Form fields with a server-side error message under them (NFR-17). Same look as
 * `@/components/form-fields`, plus `error`.
 */

type Common = { label: string; hint?: ReactNode; error?: string };

function describedBy(id: string, hint: unknown, error: unknown) {
  return [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean).join(" ") || undefined;
}

export function TextField({ label, hint, error, id, ...props }: Common & ComponentProps<typeof Input>) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <Field data-invalid={error ? true : undefined} data-disabled={props.disabled || undefined}>
      <FieldLabel htmlFor={inputId}>{label}</FieldLabel>
      <Input id={inputId} aria-invalid={error ? true : undefined} aria-describedby={describedBy(inputId, hint, error)} {...props} />
      {hint && <FieldDescription id={`${inputId}-hint`}>{hint}</FieldDescription>}
      {error && <FieldError id={`${inputId}-error`}>{error}</FieldError>}
    </Field>
  );
}

export function SelectField({ label, hint, error, id, ...props }: Common & ComponentProps<typeof NativeSelect>) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <Field data-invalid={error ? true : undefined} data-disabled={props.disabled || undefined}>
      <FieldLabel htmlFor={inputId}>{label}</FieldLabel>
      <NativeSelect id={inputId} className="w-full" aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(inputId, hint, error)} {...props} />
      {hint && <FieldDescription id={`${inputId}-hint`}>{hint}</FieldDescription>}
      {error && <FieldError id={`${inputId}-error`}>{error}</FieldError>}
    </Field>
  );
}
