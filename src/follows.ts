import { authenticateRequest } from "./auth.js";

export type RelatedUser = {
  id: number;
  username: string;
};

export type FollowsStore = {
  createUser(input: { username: string; email: string }): Promise<RelatedUser>;
  findUserById(id: number): Promise<RelatedUser | null>;
  createFollow(input: { followerId: number; followingId: number }): Promise<void>;
  findFollowing(followerId: number): Promise<RelatedUser[]>;
};

export async function createRelatedUser(
  store: FollowsStore,
  input: { username: string; email: string },
): Promise<RelatedUser> {
  if (!input.username.trim() || !input.email.includes("@")) {
    throw new Error("Username and a valid email are required");
  }
  return store.createUser({
    username: input.username.trim(),
    email: input.email.trim().toLowerCase(),
  });
}

export async function followUser(
  store: FollowsStore,
  followerId: number,
  followingId: number,
): Promise<void> {
  if (followerId === followingId) {
    throw new Error("A user cannot follow themselves");
  }

  const [follower, following] = await Promise.all([
    store.findUserById(followerId),
    store.findUserById(followingId),
  ]);
  if (!follower || !following) {
    throw new Error("Both users must exist before creating a follow relationship");
  }

  await store.createFollow({ followerId, followingId });
}

export function getFollowing(
  store: FollowsStore,
  followerId: number,
): Promise<RelatedUser[]> {
  return store.findFollowing(followerId);
}


export async function followUserWithToken(
  store: FollowsStore,
  authorizationHeader: string | undefined,
  followingId: number
): Promise<void> {
  const authenticatedUser = authenticateRequest(authorizationHeader);

  await followUser(
    store,
    authenticatedUser.id,
    followingId
  );
}