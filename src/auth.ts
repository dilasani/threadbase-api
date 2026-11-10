
import { randomBytes, scrypt as nodeScrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import jwt from "jsonwebtoken";
import "dotenv/config";

const scrypt = promisify(nodeScrypt);

const PASSWORD_HASH_VERSION = "scrypt";
const KEY_LENGTH = 64;

const JWT_SECRET: string = process.env.JWT_SECRET ?? "";

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is missing from environment variables");
}

const JWT_EXPIRES_IN = "1h";

export type AuthUser = {
  id: number;
  username: string;
};

export type StoredUser = AuthUser & {
  passwordHash: string | null;
};

export type AuthStore = {
  createUser(input: {
    username: string;
    email: string;
    passwordHash: string;
  }): Promise<StoredUser>;

  findUserByUsername(username: string): Promise<StoredUser | null>;
};

export type AuthSession = {
  token: string;
  expiresAt: Date;
  user: AuthUser;
};

function assertCredentials(username: string, password: string): void {
  if (!/^[a-zA-Z0-9_]{3,30}$/.test(username)) {
    throw new Error(
      "Username must be 3-30 characters and contain only letters, numbers, or underscores"
    );
  }

  if (password.length < 8) {
    throw new Error("Password must be at least 8 characters");
  }
}

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);

  const derivedKey = (await scrypt(
    password,
    salt,
    KEY_LENGTH
  )) as Buffer;

  return `${PASSWORD_HASH_VERSION}$${salt.toString("base64url")}$${derivedKey.toString("base64url")}`;
}

async function verifyPassword(
  password: string,
  encodedHash: string | null
): Promise<boolean> {
  if (!encodedHash) {
    return false;
  }

  const [version, encodedSalt, encodedKey] = encodedHash.split("$");

  if (version !== PASSWORD_HASH_VERSION || !encodedSalt || !encodedKey) {
    return false;
  }

  const salt = Buffer.from(encodedSalt, "base64url");
  const expectedKey = Buffer.from(encodedKey, "base64url");

  const actualKey = (await scrypt(
    password,
    salt,
    expectedKey.length
  )) as Buffer;

  return (
    actualKey.length === expectedKey.length &&
    timingSafeEqual(actualKey, expectedKey)
  );
}

export async function register(
  store: AuthStore,
  input: { username: string; email: string; password: string }
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

  return {
    id: user.id,
    username: user.username,
  };
}

export function createAuthSession(user: AuthUser): AuthSession {
  const token = jwt.sign(
    {
      userId: user.id,
      username: user.username,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

  return {
    token,
    expiresAt,
    user,
  };
}

export async function login(
  store: AuthStore,
  input: { username: string; password: string }
): Promise<AuthSession> {
  const user = await store.findUserByUsername(input.username.trim());

  const passwordMatches = user
    ? await verifyPassword(input.password, user.passwordHash)
    : false;

  if (!passwordMatches || !user) {
    throw new Error("Invalid username or password");
  }

  return createAuthSession({
    id: user.id,
    username: user.username,
  });
}

export function verifyToken(token: string): AuthUser {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    if (
      typeof decoded === "string" ||
      typeof decoded.userId !== "number" ||
      typeof decoded.username !== "string"
    ) {
      throw new Error("Invalid token payload");
    }

    return {
      id: decoded.userId,
      username: decoded.username,
    };
  } catch {
    throw new Error("Invalid or expired token");
  }
}

export function authenticateRequest(
  authorizationHeader: string | undefined
): AuthUser {
  if (!authorizationHeader) {
    throw new Error("Authorization header is required");
  }

  const [scheme, token] = authorizationHeader.split(" ");

  if (scheme !== "Bearer" || !token) {
    throw new Error("Invalid authorization format. Use Bearer token");
  }

  return verifyToken(token);
}
