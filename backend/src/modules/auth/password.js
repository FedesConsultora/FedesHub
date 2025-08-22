// src/modules/auth/password.js
import argon2 from 'argon2';

export const hashPassword = (plain) =>
  argon2.hash(plain, { type: argon2.argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 });

export const verifyPassword = (hash, plain) => argon2.verify(hash, plain);