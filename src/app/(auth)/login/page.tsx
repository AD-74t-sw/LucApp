import type { Metadata } from "next";
import { LoginForm } from "@/modules/access/ui";

export const metadata: Metadata = { title: "Iniciar sesión" };

export default function LoginPage() {
  return (
    <>
      <h1 className="mb-6 text-2xl font-medium tracking-[-0.03em]">Iniciar sesión</h1>
      <LoginForm />
    </>
  );
}
