"use client";

import { type FormEvent, startTransition, useCallback } from "react";

/**
 * Submit a form to a `useActionState` action WITHOUT React's automatic form reset.
 *
 * With `<form action={formAction}>`, React 19 calls `form.reset()` after the action. A controlled
 * `<select value>` then jumps back to the option that was selected when the page loaded (its HTML
 * default), while React state keeps the new value — so the screen shows the old choice and the
 * next save would send it. Our forms keep every value in state, so they don't need the reset.
 */
export function useSubmitWithoutReset(formAction: (data: FormData) => void) {
  return useCallback((event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    startTransition(() => formAction(data));
  }, [formAction]);
}
