"use server";

import { AuthError } from "next-auth";

import { signIn } from "@/auth";

export type LoginActionState = {
  error?: string;
};

export async function authenticate(
  _previousState: LoginActionState,
  formData: FormData
): Promise<LoginActionState> {
  const identifier = String(formData.get("identifier") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!identifier || !password) {
    return {
      error: "Veuillez renseigner votre identifiant et votre mot de passe.",
    };
  }

  try {
    await signIn("credentials", {
      identifier,
      password,
      redirectTo: "/dashboard",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      if (error.type === "CredentialsSignin") {
        return {
          error: "Identifiant ou mot de passe incorrect.",
        };
      }

      return {
        error: "Connexion impossible pour le moment.",
      };
    }

    throw error;
  }

  return {};
}
