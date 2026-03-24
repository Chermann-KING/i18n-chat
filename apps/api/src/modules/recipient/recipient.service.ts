import { Injectable } from '@nestjs/common';
import {
  NotFoundException,
  type FindRecipientsOptions,
  type MessageChannel,
  type PagedResult,
  type RecipientChannelEntity,
  type RecipientEntity,
} from '@i18n-chat/domain';
import type {
  TAddChannel,
  TCreateRecipient,
  TRecipientChannelResponse,
  TRecipientResponse,
  TUpdateRecipient,
} from '@i18n-chat/dto';
import { RecipientRepository } from './recipient.repository';

/** Result of a bulk CSV recipient import. */
export interface CsvImportResult {
  /** Number of successfully imported recipients. */
  readonly imported: number;
  /** Descriptions of rows that could not be parsed or persisted. */
  readonly errors: string[];
}

/**
 * Business logic for recipient management.
 *
 * Delegates persistence to {@link RecipientRepository}.
 */
@Injectable()
export class RecipientService {
  constructor(private readonly repository: RecipientRepository) {}

  /**
   * Returns a paginated list of recipients.
   *
   * @param options - Optional filters (language, active state, pagination).
   */
  async findAll(options?: FindRecipientsOptions): Promise<PagedResult<TRecipientResponse>> {
    const result = await this.repository.findAll(options);
    return { data: result.data.map((r) => this.toResponse(r)), total: result.total };
  }

  /**
   * Returns a single recipient by UUID.
   *
   * @param id - Recipient UUID.
   * @throws {NotFoundException} When no recipient with the given ID exists.
   */
  async findById(id: string): Promise<TRecipientResponse> {
    const recipient = await this.repository.findById(id);
    if (!recipient) throw new NotFoundException('Recipient', id);

    const channels = await this.repository.findChannels(id);
    return this.toResponse(recipient, channels);
  }

  /**
   * Creates a new recipient, optionally with initial channel contacts.
   *
   * @param data - Validated creation payload.
   */
  async create(data: TCreateRecipient): Promise<TRecipientResponse> {
    const recipient = await this.repository.create({
      fullName: data.fullName,
      preferredLanguageCode: data.preferredLanguageCode,
    });

    const channelEntities: RecipientChannelEntity[] = [];
    if (data.channels && data.channels.length > 0) {
      const created = await Promise.all(
        data.channels.map((ch) =>
          this.repository.addChannel(recipient.id, {
            channel: ch.channel as unknown as MessageChannel,
            contact: ch.contact,
          }),
        ),
      );
      channelEntities.push(...created);
    }

    return this.toResponse(recipient, channelEntities);
  }

  /**
   * Updates an existing recipient's profile fields.
   *
   * @param id - UUID of the recipient to update.
   * @param data - Validated update payload.
   * @throws {NotFoundException} When no recipient with the given ID exists.
   */
  async update(id: string, data: TUpdateRecipient): Promise<TRecipientResponse> {
    const exists = await this.repository.findById(id);
    if (!exists) throw new NotFoundException('Recipient', id);

    const recipient = await this.repository.update(id, data);
    const channels = await this.repository.findChannels(id);
    return this.toResponse(recipient, channels);
  }

  /**
   * Soft-deletes a recipient (sets `isActive = false`).
   *
   * @param id - UUID of the recipient to deactivate.
   * @throws {NotFoundException} When no recipient with the given ID exists.
   */
  async delete(id: string): Promise<void> {
    const exists = await this.repository.findById(id);
    if (!exists) throw new NotFoundException('Recipient', id);
    await this.repository.delete(id);
  }

  /**
   * Adds a contact channel to a recipient.
   *
   * @param id - UUID of the recipient.
   * @param data - Channel type and contact value.
   * @throws {NotFoundException} When no recipient with the given ID exists.
   */
  async addChannel(id: string, data: TAddChannel): Promise<TRecipientChannelResponse> {
    const exists = await this.repository.findById(id);
    if (!exists) throw new NotFoundException('Recipient', id);

    const channel = await this.repository.addChannel(id, {
      channel: data.channel as unknown as MessageChannel,
      contact: data.contact,
    });
    return this.toChannelResponse(channel);
  }

  /**
   * Removes a contact channel from a recipient.
   *
   * @param id - UUID of the recipient.
   * @param channel - The channel type to remove.
   * @throws {NotFoundException} When no recipient with the given ID exists.
   */
  async removeChannel(id: string, channel: string): Promise<void> {
    const exists = await this.repository.findById(id);
    if (!exists) throw new NotFoundException('Recipient', id);
    await this.repository.removeChannel(id, channel as unknown as MessageChannel);
  }

  /**
   * Bulk-imports recipients from a CSV buffer.
   *
   * Expected CSV format (header row required):
   * ```
   * fullName,preferredLanguageCode
   * Amina Benali,fr
   * Jan Peeters,nl
   * ```
   *
   * @param buffer - Raw CSV file bytes (UTF-8 encoded).
   * @returns Import summary with count of imported rows and any error messages.
   */
  async importFromCsv(buffer: Buffer): Promise<CsvImportResult> {
    const lines = buffer
      .toString('utf-8')
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

    if (lines.length < 2) {
      return { imported: 0, errors: ['CSV must contain a header row and at least one data row'] };
    }

    // Skip header row (index 0) and process each data row concurrently.
    const results = await Promise.all(lines.slice(1).map((line) => this.importRow(line)));

    const errors = results.filter((r) => !r.success).map((r) => r.error as string);
    return { imported: results.filter((r) => r.success).length, errors };
  }

  /**
   * Parses and persists a single CSV data row.
   *
   * Delegates parsing to {@link parseRow} so each private method stays focused.
   *
   * @param line - A trimmed CSV line, e.g. `'Amina Benali,fr'`.
   * @returns `{ success: true }` on import or `{ success: false, error }` on failure.
   */
  private async importRow(line: string): Promise<{ success: boolean; error: string | null }> {
    const data = this.parseRow(line);
    if (!data) return { success: false, error: `Skipped invalid row: "${line}"` };

    try {
      await this.repository.create(data);
      return { success: true, error: null };
    } catch {
      return { success: false, error: `Failed to import row: "${line}"` };
    }
  }

  /**
   * Parses a CSV line into a recipient creation data object.
   *
   * @param line - A trimmed CSV line with exactly two comma-separated fields.
   * @returns Parsed data, or `null` if any field is missing or blank.
   */
  private parseRow(line: string): { fullName: string; preferredLanguageCode: string } | null {
    const [rawName, rawLang] = line.split(',');
    const fullName = rawName?.trim() ?? '';
    const preferredLanguageCode = rawLang?.trim() ?? '';

    if (!fullName || !preferredLanguageCode) return null;

    return { fullName, preferredLanguageCode };
  }

  /**
   * Maps a domain {@link RecipientEntity} to the API response shape.
   */
  private toResponse(
    recipient: RecipientEntity,
    channels: RecipientChannelEntity[] = [],
  ): TRecipientResponse {
    return {
      id: recipient.id,
      fullName: recipient.fullName,
      preferredLanguageCode: recipient.preferredLanguageCode,
      isActive: recipient.isActive,
      createdAt: recipient.createdAt.toISOString(),
      updatedAt: recipient.updatedAt.toISOString(),
      channels: channels.map((ch) => this.toChannelResponse(ch)),
    };
  }

  /**
   * Maps a domain {@link RecipientChannelEntity} to the API channel response shape.
   */
  private toChannelResponse(channel: RecipientChannelEntity): TRecipientChannelResponse {
    return {
      id: channel.id,
      channel: channel.channel as unknown as TRecipientChannelResponse['channel'],
      contact: channel.contact,
      isActive: channel.isActive,
    };
  }
}
