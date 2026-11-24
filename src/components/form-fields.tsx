import { useId, type ComponentProps, type ReactNode } from "react";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";

type FieldName = { label: string; hint?: ReactNode };

export function InputField({ label, hint, id, ...props }: FieldName & ComponentProps<typeof Input>) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const descriptionId = hint ? `${inputId}-hint` : undefined;
  return (
    <Field data-invalid={props["aria-invalid"] || undefined} data-disabled={props.disabled || undefined}>
      <FieldLabel htmlFor={inputId}>{label}</FieldLabel>
      <Input id={inputId} aria-describedby={descriptionId} {...props} />
      {hint && <FieldDescription id={descriptionId}>{hint}</FieldDescription>}
    </Field>
  );
}

export function NativeSelectField({ label, id, ...props }: Pick<FieldName, "label"> & ComponentProps<typeof NativeSelect>) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <Field data-invalid={props["aria-invalid"] || undefined} data-disabled={props.disabled || undefined}>
      <FieldLabel htmlFor={inputId}>{label}</FieldLabel>
      <NativeSelect id={inputId} className="w-full" {...props} />
    </Field>
  );
}
