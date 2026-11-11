
import {
  register,
  login,
  createAuthSession,
  verifyToken,
  authenticateRequest,
  type AuthStore,
} from "../auth";

describe("Authentication Unit Tests", () => {
  let mockStore: jest.Mocked<AuthStore>;

  beforeEach(() => {
    mockStore = {
      createUser: jest.fn(),
      findUserByUsername: jest.fn(),
    };
  });

  test("1. should register a user successfully", async () => {
    mockStore.createUser.mockResolvedValue({
      id: 1,
      username: "testuser",
      passwordHash: "hashed-password",
    });

    const result = await register(mockStore, {
      username: " testuser ",
      email: " TEST@EXAMPLE.COM ",
      password: "password123",
    });

    expect(result).toEqual({
      id: 1,
      username: "testuser",
    });

    expect(mockStore.createUser).toHaveBeenCalledWith(
      expect.objectContaining({
        username: "testuser",
        email: "test@example.com",
      })
    );
  });

  test("2. should reject a username shorter than 3 characters", async () => {
    await expect(
      register(mockStore, {
        username: "ab",
        email: "test@example.com",
        password: "password123",
      })
    ).rejects.toThrow("Username must be 3-30 characters");
  });

  test("3. should reject a password shorter than 8 characters", async () => {
    await expect(
      register(mockStore, {
        username: "testuser",
        email: "test@example.com",
        password: "123",
      })
    ).rejects.toThrow("Password must be at least 8 characters");
  });

  test("4. should reject an invalid email address", async () => {
    await expect(
      register(mockStore, {
        username: "testuser",
        email: "invalid-email",
        password: "password123",
      })
    ).rejects.toThrow("A valid email is required");
  });

  test("5. should create and verify an authentication token", () => {
    const session = createAuthSession({
      id: 1,
      username: "testuser",
    });

    const verifiedUser = verifyToken(session.token);

    expect(verifiedUser).toEqual({
      id: 1,
      username: "testuser",
    });
  });

  test("6. should reject an invalid token", () => {
    expect(() => verifyToken("invalid-token")).toThrow(
      "Invalid or expired token"
    );
  });

  test("7. should reject login with incorrect credentials", async () => {
    mockStore.findUserByUsername.mockResolvedValue({
      id: 1,
      username: "testuser",
      passwordHash: null,
    });

    await expect(
      login(mockStore, {
        username: "testuser",
        password: "wrongpassword",
      })
    ).rejects.toThrow("Invalid username or password");
  });

  test("8. should reject a missing authorization header", () => {
    expect(() => authenticateRequest(undefined)).toThrow(
      "Authorization header is required"
    );
  });
});
