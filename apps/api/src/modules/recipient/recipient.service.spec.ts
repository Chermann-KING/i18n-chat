import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import {
  MessageChannel,
  NotFoundException,
  type RecipientChannelEntity,
  type RecipientEntity,
} from '@i18n-chat/domain';
import { RecipientRepository } from './recipient.repository';
import { RecipientService } from './recipient.service';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const mockRecipient: RecipientEntity = {
  id: 'recipient-uuid',
  fullName: 'Amina Benali',
  preferredLanguageCode: 'fr',
  isActive: true,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

const mockChannel: RecipientChannelEntity = {
  id: 'channel-uuid',
  recipientId: 'recipient-uuid',
  channel: MessageChannel.EMAIL,
  contact: 'amina@example.com',
  isActive: true,
  createdAt: new Date('2026-01-01'),
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('RecipientService', () => {
  let service: RecipientService;
  let repository: jest.Mocked<RecipientRepository>;

  beforeEach(async () => {
    const repositoryMock: jest.Mocked<RecipientRepository> = {
      findById: jest.fn(),
      findAll: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      addChannel: jest.fn(),
      removeChannel: jest.fn(),
      findChannels: jest.fn(),
    } as unknown as jest.Mocked<RecipientRepository>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [RecipientService, { provide: RecipientRepository, useValue: repositoryMock }],
    }).compile();

    service = module.get<RecipientService>(RecipientService);
    repository = module.get(RecipientRepository);
  });

  // ── findAll() ─────────────────────────────────────────────────────────────

  describe('findAll()', () => {
    it('returns paged recipient responses', async () => {
      jest.spyOn(repository, 'findAll').mockResolvedValue({ data: [mockRecipient], total: 1 });

      const result = await service.findAll();

      expect(result.total).toBe(1);
      expect(result.data[0]).toMatchObject({ id: 'recipient-uuid', fullName: 'Amina Benali' });
    });
  });

  // ── findById() ────────────────────────────────────────────────────────────

  describe('findById()', () => {
    it('returns recipient with channels', async () => {
      jest.spyOn(repository, 'findById').mockResolvedValue(mockRecipient);
      jest.spyOn(repository, 'findChannels').mockResolvedValue([mockChannel]);

      const result = await service.findById('recipient-uuid');

      expect(result.id).toBe('recipient-uuid');
      expect(result.channels).toHaveLength(1);
    });

    it('throws NotFoundException for unknown ID', async () => {
      jest.spyOn(repository, 'findById').mockResolvedValue(null);

      await expect(service.findById('unknown')).rejects.toThrow(NotFoundException);
    });
  });

  // ── create() ──────────────────────────────────────────────────────────────

  describe('create()', () => {
    it('creates a recipient without channels', async () => {
      jest.spyOn(repository, 'create').mockResolvedValue(mockRecipient);

      const result = await service.create({
        fullName: 'Amina Benali',
        preferredLanguageCode: 'fr',
      });

      expect(result.fullName).toBe('Amina Benali');
      expect(result.channels).toHaveLength(0);
    });

    it('creates channels when provided', async () => {
      jest.spyOn(repository, 'create').mockResolvedValue(mockRecipient);
      jest.spyOn(repository, 'addChannel').mockResolvedValue(mockChannel);

      const result = await service.create({
        fullName: 'Amina Benali',
        preferredLanguageCode: 'fr',
        channels: [{ channel: MessageChannel.EMAIL, contact: 'amina@example.com' }],
      });

      expect(result.channels).toHaveLength(1);
      expect(repository.addChannel).toHaveBeenCalledTimes(1);
    });
  });

  // ── delete() ──────────────────────────────────────────────────────────────

  describe('delete()', () => {
    it('soft-deletes a recipient', async () => {
      jest.spyOn(repository, 'findById').mockResolvedValue(mockRecipient);
      jest.spyOn(repository, 'delete').mockResolvedValue(undefined);

      await service.delete('recipient-uuid');

      expect(repository.delete).toHaveBeenCalledWith('recipient-uuid');
    });

    it('throws NotFoundException for unknown ID', async () => {
      jest.spyOn(repository, 'findById').mockResolvedValue(null);

      await expect(service.delete('unknown')).rejects.toThrow(NotFoundException);
    });
  });

  // ── importFromCsv() ───────────────────────────────────────────────────────

  describe('importFromCsv()', () => {
    it('imports valid CSV rows', async () => {
      jest.spyOn(repository, 'create').mockResolvedValue(mockRecipient);

      const csv = 'fullName,preferredLanguageCode\nAmina Benali,fr\nJan Peeters,nl\n';
      const result = await service.importFromCsv(Buffer.from(csv, 'utf-8'));

      expect(result.imported).toBe(2);
      expect(result.errors).toHaveLength(0);
    });

    it('reports errors for malformed rows', async () => {
      const csv = 'fullName,preferredLanguageCode\nBad Row\n';
      const result = await service.importFromCsv(Buffer.from(csv, 'utf-8'));

      expect(result.imported).toBe(0);
      expect(result.errors).toHaveLength(1);
    });

    it('returns an error for an empty CSV', async () => {
      const result = await service.importFromCsv(Buffer.from('', 'utf-8'));

      expect(result.imported).toBe(0);
      expect(result.errors).toHaveLength(1);
    });
  });
});
