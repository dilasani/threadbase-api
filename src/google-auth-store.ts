
import { prisma } from "./prisma.js";
import type { GoogleAuthStore } from "./google-auth.js";

export const prismaGoogleAuthStore: GoogleAuthStore = {
  async findUserByGoogleId(googleId) {
    return prisma.user.findUnique({
      where: { googleId },
      select: {
        id: true,
        username: true,
      },
    });
  },

  async findUserByEmail(email) {
    return prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        username: true,
        googleId: true,
      },
    });
  },

  async findUserByUsername(username) {
    return prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
      },
    });
  },

  async createGoogleUser(input) {
    return prisma.user.create({
      data: input,
      select: {
        id: true,
        username: true,
      },
    });
  },

  async linkGoogleId(userId, googleId) {
    return prisma.user.update({
      where: { id: userId },
      data: { googleId },
      select: {
        id: true,
        username: true,
      },
    });
  },
};
