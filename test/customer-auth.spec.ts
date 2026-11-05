import 'reflect-metadata';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcrypt';
import { CustomerAuthService } from '../src/core/auth/customer/customer-auth.service.js';
import type { UsersService } from '../src/modules/users/users.service.js';
import { User } from '../src/modules/users/entities/user.entity.js';
import { Role } from '../src/modules/users/roles.js';

describe('CustomerAuthService login', () => {
  const password = 'correct-password-for-tests';
  let hash: string;
  let jwt: JwtService;

  beforeAll(async () => {
    hash = await bcrypt.hash(password, 4);
    jwt = new JwtService({
      secret: 'customer-auth-tests-only-secret-32-characters',
      signOptions: { expiresIn: '15m' },
    });
  });

  function authFor(user: User | null): CustomerAuthService {
    const users = {
      findOneByEmail: async () => user,
    } as unknown as UsersService;
    return new CustomerAuthService(users, jwt);
  }

  function customer(): User {
    return Object.assign(new User(), {
      id: 7,
      email: 'customer@example.com',
      password: hash,
      role: Role.customer,
    });
  }

  it('verifies the bcrypt hash and issues a valid JWT without exposing the password', async () => {
    const result = await authFor(customer()).login({
      email: 'customer@example.com',
      password,
    });
    expect(result.token_type).toBe('Bearer');
    expect(await jwt.verifyAsync(result.access_token)).toMatchObject({
      sub: 7,
    });
    expect(Object.keys(result).sort()).toEqual(['access_token', 'token_type']);
  });

  it('returns an unauthorized error for an incorrect password', async () => {
    await expect(
      authFor(customer()).login({
        email: 'customer@example.com',
        password: 'wrong-password',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('returns the same unauthorized error for an unknown customer', async () => {
    await expect(
      authFor(null).login({ email: 'unknown@example.com', password }),
    ).rejects.toMatchObject({
      status: 401,
      message: 'Invalid email or password',
    });
  });

  it('does not throw a bcrypt argument error when the password hash is missing', async () => {
    const user = customer();
    Reflect.deleteProperty(user, 'password');
    await expect(
      authFor(user).login({ email: 'customer@example.com', password }),
    ).rejects.toMatchObject({
      status: 401,
      message: 'Invalid email or password',
    });
  });
});
