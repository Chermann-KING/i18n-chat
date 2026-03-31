import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { NotFoundException } from '@i18n-chat/domain';
import { UserRole } from '@prisma/client';
import type { User } from '@prisma/client';
import * as argon2 from 'argon2';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { EmailChannel } from '../channel/email/email.channel';
import { UserService } from './user.service';

// Jest hoists jest.mock() calls automatically — placing after imports is safe.
jest.mock('argon2');

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const mockUser: User = {
  id: 'user-uuid',
  email: 'admin@example.com',
  passwordHash: 'hashed',
  role: UserRole.ADMIN,
  firstName: null,
  lastName: null,
  preferredLanguageCode: 'fr',
  notifyOnFailure: false,
  isActive: true,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('UserService', () => {
  let service: UserService;
  let prisma: jest.Mocked<Pick<PrismaService, 'user'>>;

  beforeEach(async () => {
    const userMock = {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: PrismaService, useValue: { user: userMock } },
        { provide: AuditService, useValue: { log: jest.fn().mockResolvedValue(undefined) } },
        { provide: EmailChannel, useValue: { send: jest.fn().mockResolvedValue('msg-id') } },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('http://localhost:3000') },
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    prisma = module.get(PrismaService);
  });

  // ── findAll() ─────────────────────────────────────────────────────────────

  describe('findAll()', () => {
    it('returns mapped user responses', async () => {
      jest.spyOn(prisma.user, 'findMany').mockResolvedValue([mockUser]);

      const result = await service.findAll();

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({ id: mockUser.id, email: mockUser.email });
      expect(result[0]).not.toHaveProperty('passwordHash');
    });

    it('converts Date fields to ISO strings', async () => {
      jest.spyOn(prisma.user, 'findMany').mockResolvedValue([mockUser]);

      const result = await service.findAll();

      expect(typeof result[0].createdAt).toBe('string');
      expect(typeof result[0].updatedAt).toBe('string');
    });
  });

  // ── findById() ────────────────────────────────────────────────────────────

  describe('findById()', () => {
    it('returns the user for a known ID', async () => {
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockUser);

      const result = await service.findById(mockUser.id);

      expect(result.id).toBe(mockUser.id);
    });

    it('throws NotFoundException for an unknown ID', async () => {
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(null);

      await expect(service.findById('unknown')).rejects.toThrow(NotFoundException);
    });
  });

  // ── create() ──────────────────────────────────────────────────────────────

  describe('create()', () => {
    it('hashes the password and persists the user', async () => {
      jest.mocked(argon2.hash).mockResolvedValue('hashed-password');
      jest.spyOn(prisma.user, 'create').mockResolvedValue(mockUser);

      const result = await service.create(
        {
          email: 'admin@example.com',
          password: 'Admin1234!',
          role: undefined,
          preferredLanguageCode: 'fr',
        },
        'actor-uuid',
      );

      expect(result.email).toBe(mockUser.email);
      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ passwordHash: 'hashed-password' }),
        }),
      );
    });
  });

  // ── update() ──────────────────────────────────────────────────────────────

  describe('update()', () => {
    it('updates the user and returns the response', async () => {
      const updated: User = { ...mockUser, email: 'new@example.com' };
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockUser);
      jest.spyOn(prisma.user, 'update').mockResolvedValue(updated);

      const result = await service.update(mockUser.id, { email: 'new@example.com' }, 'actor-uuid');

      expect(result.email).toBe('new@example.com');
    });

    it('hashes the new password when provided', async () => {
      jest.mocked(argon2.hash).mockResolvedValue('new-hash');
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockUser);
      jest.spyOn(prisma.user, 'update').mockResolvedValue(mockUser);

      await service.update(mockUser.id, { password: 'NewPass123!' }, 'actor-uuid');

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ passwordHash: 'new-hash' }),
        }),
      );
    });

    it('throws NotFoundException for an unknown ID', async () => {
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(null);

      await expect(service.update('unknown', { email: 'x@x.com' }, 'actor-uuid')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ── delete() ──────────────────────────────────────────────────────────────

  describe('delete()', () => {
    it('soft-deletes the user by setting isActive=false', async () => {
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockUser);
      jest.spyOn(prisma.user, 'update').mockResolvedValue({ ...mockUser, isActive: false });

      await service.delete(mockUser.id, 'actor-uuid');

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: { isActive: false },
      });
    });

    it('throws NotFoundException for an unknown ID', async () => {
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(null);

      await expect(service.delete('unknown', 'actor-uuid')).rejects.toThrow(NotFoundException);
    });
  });
});
