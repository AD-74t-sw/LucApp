import type { Metadata } from "next";
import { RegisterForm } from "@/modules/access/ui";

export const metadata: Metadata = { title: "Crear cuenta" };

export default function RegisterPage() {
  return (
    <>
      <h1 className="mb-6 text-2xl font-medium tracking-[-0.03em]">Crear cuenta</h1>
      <RegisterForm />
    </>
  );
}
