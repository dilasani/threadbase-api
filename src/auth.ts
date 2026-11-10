import { createHash, randomBytes, scrypt as nodeScrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(nodeScrypt);
const PASSWORD_HASH_VERSION = "scrypt";
const KEY_LENGTH = 64;
const SESSION_TOKEN_BYTES = 32;
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30;

export type AuthUser = {
  id: number;
  username: string;
};

export type StoredUser = AuthUser & {
  passwordHash: string;
};

export type AuthStore = {
  createUser(input: {
    username: string;
    email: string;
    passwordHash: string;
  }): Promise<StoredUser>;
  findUserByUsername(username: string): Promise<StoredUser | null>;
  createSession(input: {
    userId: number;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<void>;
};

export type AuthSession = {
  token: string;
  expiresAt: Date;
  user: AuthUser;
};

function assertCredentials(username: string, password: string): void {
  if (!/^[a-zA-Z0-9_]{3,30}$/.test(username)) {
    throw new Error("Username must be 3-30 characters and contain only letters, numbers, or underscores");
  }
  if (password.length < 8) {
    throw new Error("Password must be at least 8 characters");
  }
}

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derivedKey = (await scrypt(password, salt, KEY_LENGTH)) as Buffer;
  return `${PASSWORD_HASH_VERSION}$${salt.toString("base64url")}$${derivedKey.toString("base64url")}`;
}

async function verifyPassword(password: string, encodedHash: string): Promise<boolean> {
  const [version, encodedSalt, encodedKey] = encodedHash.split("$");
  if (version !== PASSWORD_HASH_VERSION || !encodedSalt || !encodedKey) {
    return false;
  }

  const salt = Buffer.from(encodedSalt, "base64url");
  const expectedKey = Buffer.from(encodedKey, "base64url");
  const actualKey = (await scrypt(password, salt, expectedKey.length)) as Buffer;
  return actualKey.length === expectedKey.length && timingSafeEqual(actualKey, expectedKey);
}

function tokenHash(token: string): string {
  return createHash("sha256").update(token).digest("base64url");
}

export async function register(
  store: AuthStore,
  input: { username: string; email: string; password: string },
): Promise<AuthUser> {
  const username = input.username.trim();
  const email = input.email.trim().toLowerCase();
  assertCredentials(username, input.password);
  if (!email.includes("@")) {
    throw new Error("A valid email is required");
  }

  const user = await store.createUser({
    username,
    email,
    passwordHash: await hashPassword(input.password),
  });
  return { id: user.id, username: user.username };
}

export async function login(
  store: AuthStore,
  input: { username: string; password: string },
): Promise<AuthSession> {
  const user = await store.findUserByUsername(input.username.trim());
  const passwordMatches = user ? await verifyPassword(input.password, user.passwordHash) : false;
  if (!passwordMatches || !user) {
    throw new Error("Invalid username or password");
  }

  const token = randomBytes(SESSION_TOKEN_BYTES).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await store.createSession({ userId: user.id, tokenHash: tokenHash(token), expiresAt });
  return { token, expiresAt, user: { id: user.id, username: user.username } };
}
