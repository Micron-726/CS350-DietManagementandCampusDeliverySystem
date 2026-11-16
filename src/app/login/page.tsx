import { Suspense } from "react";
import { login, signup } from "./actions";

type SearchParams = Promise<{ error?: string }>;

export default function LoginPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <main className="mx-auto mt-24 max-w-sm p-6">
      <h1 className="mb-6 text-2xl font-semibold">Sign in</h1>
      <form className="flex flex-col gap-3">
        <input name="email" type="email" placeholder="Email" required className="rounded border p-2" />
        <input
          name="password"
          type="password"
          placeholder="Password (min 6 chars)"
          required
          minLength={6}
          className="rounded border p-2"
        />
        {/* searchParams is request data: resolve it inside a boundary so the form prerenders. */}
        <Suspense fallback={null}>
          <LoginError searchParams={searchParams} />
        </Suspense>
        <button formAction={login} className="rounded bg-black p-2 text-white">
          Log in
        </button>
        <button formAction={signup} className="rounded border p-2">
          Sign up
        </button>
      </form>
    </main>
  );
}

async function LoginError({ searchParams }: { searchParams: SearchParams }) {
  const { error } = await searchParams;
  return error ? <p className="text-sm text-red-600">{error}</p> : null;
}
