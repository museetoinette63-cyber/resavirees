import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { auth, signIn } from "@/lib/auth";

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await auth();
  if (session?.user) {
    redirect("/admin");
  }

  const { error } = await searchParams;

  async function login(formData: FormData) {
    "use server";
    try {
      await signIn("credentials", {
        email: formData.get("email"),
        password: formData.get("password"),
        redirectTo: "/admin",
      });
    } catch (err) {
      if (err instanceof AuthError) {
        redirect("/admin/login?error=1");
      }
      throw err;
    }
  }

  return (
    <div className="flex min-h-full flex-1 items-center justify-center bg-stone-100 px-4">
      <form
        action={login}
        className="w-full max-w-sm space-y-4 rounded-lg border border-stone-200 bg-white p-8 shadow-sm"
      >
        <h1 className="text-lg font-semibold text-stone-900">Back-office</h1>
        <p className="text-sm text-stone-500">Connectez-vous pour administrer le site.</p>

        {error ? (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            Identifiants incorrects.
          </p>
        ) : null}

        <div className="space-y-1">
          <label htmlFor="email" className="text-sm font-medium text-stone-700">
            E-mail
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="username"
            className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-stone-500 focus:outline-none"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="password" className="text-sm font-medium text-stone-700">
            Mot de passe
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-stone-500 focus:outline-none"
          />
        </div>

        <button
          type="submit"
          className="w-full rounded-md bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700"
        >
          Se connecter
        </button>
      </form>
    </div>
  );
}
