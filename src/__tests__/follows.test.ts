
import {
  createRelatedUser,
  followUser,
  getFollowing,
  followUserWithToken,
  type FollowsStore,
} from "../follows.ts";

import { createAuthSession } from "../auth.ts";

describe("Follow Unit Tests", () => {
  let mockStore: jest.Mocked<FollowsStore>;

  beforeEach(() => {
    mockStore = {
      createUser: jest.fn(),
      findUserById: jest.fn(),
      createFollow: jest.fn(),
      findFollowing: jest.fn(),
    };
  });

  test("1. should create a related user successfully", async () => {
    mockStore.createUser.mockResolvedValue({
      id: 1,
      username: "testuser",
    });

    const result = await createRelatedUser(mockStore, {
      username: " testuser ",
      email: " TEST@EXAMPLE.COM ",
    });

    expect(result).toEqual({
      id: 1,
      username: "testuser",
    });

    expect(mockStore.createUser).toHaveBeenCalledWith({
      username: "testuser",
      email: "test@example.com",
    });
  });

  test("2. should reject an empty username", async () => {
    await expect(
      createRelatedUser(mockStore, {
        username: "   ",
        email: "test@example.com",
      })
    ).rejects.toThrow("Username and a valid email are required");
  });

  test("3. should reject an invalid email", async () => {
    await expect(
      createRelatedUser(mockStore, {
        username: "testuser",
        email: "invalid-email",
      })
    ).rejects.toThrow("Username and a valid email are required");
  });

  test("4. should create a follow relationship successfully", async () => {
    mockStore.findUserById.mockResolvedValue({
      id: 1,
      username: "testuser",
    });

    mockStore.createFollow.mockResolvedValue(undefined);

    await followUser(mockStore, 1, 2);

    expect(mockStore.createFollow).toHaveBeenCalledWith({
      followerId: 1,
      followingId: 2,
    });
  });

  test("5. should reject when a user follows themselves", async () => {
    await expect(
      followUser(mockStore, 1, 1)
    ).rejects.toThrow("A user cannot follow themselves");
  });

  test("6. should reject when both users do not exist", async () => {
    mockStore.findUserById.mockResolvedValue(null);

    await expect(
      followUser(mockStore, 1, 2)
    ).rejects.toThrow(
      "Both users must exist before creating a follow relationship"
    );
  });

  test("7. should return the list of followed users", async () => {
    const followingUsers = [
      { id: 2, username: "user2" },
      { id: 3, username: "user3" },
    ];

    mockStore.findFollowing.mockResolvedValue(followingUsers);

    const result = await getFollowing(mockStore, 1);

    expect(result).toEqual(followingUsers);
    expect(mockStore.findFollowing).toHaveBeenCalledWith(1);
  });

  test("8. should follow a user using a valid authentication token", async () => {
    const session = createAuthSession({
      id: 1,
      username: "testuser",
    });

    mockStore.findUserById.mockResolvedValue({
      id: 1,
      username: "testuser",
    });

    mockStore.createFollow.mockResolvedValue(undefined);

    await followUserWithToken(
      mockStore,
      `Bearer ${session.token}`,
      2
    );

    expect(mockStore.createFollow).toHaveBeenCalledWith({
      followerId: 1,
      followingId: 2,
    });
  });

  test("9. should reject an invalid authentication token", async () => {
    await expect(
      followUserWithToken(
        mockStore,
        "Bearer invalid-token",
        2
      )
    ).rejects.toThrow("Invalid or expired token");
  });
});
