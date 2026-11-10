
import { randomBytes } from "node:crypto";
import { OAuth2Client } from "google-auth-library";
import {
  createAuthSession,
  type AuthSession,
  type AuthUser,
} from "./auth.js";

const googleClient = new OAuth2Client();

export type GoogleAuthStore = {
  findUserByGoogleId(googleId: string): Promise<AuthUser | null>;

  findUserByEmail(
    email: string
  ): Promise<(AuthUser & { googleId: string | null }) | null>;

  findUserByUsername(username: string): Promise<AuthUser | null>;

  createGoogleUser(input: {
    username: string;
    email: string;
    googleId: string;
    passwordHash: null;
  }): Promise<AuthUser>;

  linkGoogleId(
    userId: number,
    googleId: string
  ): Promise<AuthUser>;
};

function generateUsernameBase(name: string, email: string): string {
  const source = name || email.split("@")[0] || "user";

  const cleaned = source
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, 22);

  return cleaned.length >= 3 ? cleaned : "user";
}

async function generateUniqueUsername(
  store: GoogleAuthStore,
  name: string,
  email: string
): Promise<string> {
  const base = generateUsernameBase(name, email);

  for (let attempt = 0; attempt < 5; attempt++) {
    const suffix = randomBytes(3).toString("hex");
    const username = `${base}_${suffix}`;

    const existingUser = await store.findUserByUsername(username);

    if (!existingUser) {
      return username;
    }
  }

  throw new Error("Could not generate a unique username");
}

export async function googleLogin(
  store: GoogleAuthStore,
  idToken: string
): Promise<AuthSession> {
  const googleClientId = process.env.GOOGLE_CLIENT_ID;

  if (!googleClientId) {
    throw new Error("GOOGLE_CLIENT_ID is missing from environment variables");
  }

  if (!idToken.trim()) {
    throw new Error("Google ID token is required");
  }

  const ticket = await googleClient.verifyIdToken({
    idToken,
    audience: googleClientId,
  });

  const payload = ticket.getPayload();

  if (
    !payload ||
    !payload.sub ||
    !payload.email ||
    payload.email_verified !== true
  ) {
    throw new Error("Google account email must be verified");
  }

  const googleId = payload.sub;
  const email = payload.email.trim().toLowerCase();

  // Check whether this Google account already exists.
  const googleUser = await store.findUserByGoogleId(googleId);

  if (googleUser) {
    return createAuthSession(googleUser);
  }

  // Check whether an account with this verified email already exists.
  const existingUser = await store.findUserByEmail(email);

  if (existingUser) {
    if (
      existingUser.googleId &&
      existingUser.googleId !== googleId
    ) {
      throw new Error("This email is linked to another Google account");
    }

    const linkedUser = await store.linkGoogleId(
      existingUser.id,
      googleId
    );

    return createAuthSession(linkedUser);
  }

  // Create a new user for this Google account.
  const username = await generateUniqueUsername(
    store,
    payload.name ?? "",
    email
  );

  const newUser = await store.createGoogleUser({
    username,
    email,
    googleId,
    passwordHash: null,
  });

  return createAuthSession(newUser);
}
