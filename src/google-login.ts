
import { googleLogin } from "./google-auth.js";
import { prismaGoogleAuthStore } from "./google-auth-store.js";

export async function loginWithGoogle(idToken: string) {
  return googleLogin(prismaGoogleAuthStore, idToken);
}
