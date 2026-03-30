import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type {
  TAddChannel,
  TCreateRecipient,
  TRecipientChannelResponse,
  TRecipientResponse,
  TUpdateRecipient,
} from '@i18n-chat/dto';
import { AddChannelSchema, CreateRecipientSchema, UpdateRecipientSchema } from '@i18n-chat/dto';
import type { PagedResult } from '@i18n-chat/domain';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import type { CsvImportResult } from './recipient.service';
import { RecipientService } from './recipient.service';

/**
 * Manages recipient profiles and their contact channels.
 *
 * Routes are prefixed `/api/v1/recipients` via the global API prefix.
 */
@ApiTags('recipients')
@Controller('recipients')
export class RecipientController {
  constructor(private readonly recipientService: RecipientService) {}

  /**
   * Returns a paginated list of recipients.
   *
   * @param languageCode - Filter by preferred language code.
   * @param isActive - Filter by active status (default: all).
   * @param page - Page number (1-based, default: 1).
   * @param limit - Results per page (default: 20).
   */
  @Get()
  @ApiOperation({ summary: 'List recipients (paginated)' })
  @ApiResponse({ status: 200, description: 'Paged recipient list' })
  findAll(
    @Query('languageCode') languageCode?: string,
    @Query('isActive') isActive?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<PagedResult<TRecipientResponse>> {
    return this.recipientService.findAll({
      preferredLanguageCode: languageCode,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
      page: page !== undefined ? parseInt(page, 10) : undefined,
      limit: limit !== undefined ? parseInt(limit, 10) : undefined,
    });
  }

  /**
   * Returns a single recipient with their channels.
   *
   * @param id - Recipient UUID.
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get recipient by ID' })
  @ApiResponse({ status: 200, description: 'Recipient with channels' })
  @ApiResponse({ status: 404, description: 'Recipient not found' })
  findOne(@Param('id') id: string): Promise<TRecipientResponse> {
    return this.recipientService.findById(id);
  }

  /**
   * Creates a new recipient, optionally with initial channel contacts.
   *
   * @param body - Validated creation payload.
   * @param actor - The authenticated staff user performing the action.
   */
  @Post()
  @ApiOperation({ summary: 'Create a recipient' })
  @ApiResponse({ status: 201, description: 'Created recipient' })
  create(
    @Body(new ZodValidationPipe(CreateRecipientSchema)) body: TCreateRecipient,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<TRecipientResponse> {
    return this.recipientService.create(body, actor.id);
  }

  /**
   * Updates an existing recipient's profile.
   *
   * @param id - UUID of the recipient to update.
   * @param body - Validated update payload.
   * @param actor - The authenticated staff user performing the action.
   */
  @Patch(':id')
  @ApiOperation({ summary: 'Update a recipient' })
  @ApiResponse({ status: 200, description: 'Updated recipient' })
  @ApiResponse({ status: 404, description: 'Recipient not found' })
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateRecipientSchema)) body: TUpdateRecipient,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<TRecipientResponse> {
    return this.recipientService.update(id, body, actor.id);
  }

  /**
   * Soft-deletes a recipient (sets `isActive = false`).
   *
   * @param id - UUID of the recipient to deactivate.
   * @param actor - The authenticated staff user performing the action.
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Deactivate a recipient' })
  @ApiResponse({ status: 204, description: 'Recipient deactivated' })
  @ApiResponse({ status: 404, description: 'Recipient not found' })
  async delete(@Param('id') id: string, @CurrentUser() actor: AuthenticatedUser): Promise<void> {
    await this.recipientService.delete(id, actor.id);
  }

  /**
   * Adds a contact channel to a recipient.
   *
   * @param id - Recipient UUID.
   * @param body - Channel type and contact value.
   * @param actor - The authenticated staff user performing the action.
   */
  @Post(':id/channels')
  @ApiOperation({ summary: 'Add a contact channel to a recipient' })
  @ApiResponse({ status: 201, description: 'Created channel' })
  @ApiResponse({ status: 404, description: 'Recipient not found' })
  addChannel(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(AddChannelSchema)) body: TAddChannel,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<TRecipientChannelResponse> {
    return this.recipientService.addChannel(id, body, actor.id);
  }

  /**
   * Removes a contact channel from a recipient.
   *
   * @param id - Recipient UUID.
   * @param channel - Channel type to remove (e.g. `EMAIL`).
   * @param actor - The authenticated staff user performing the action.
   */
  @Delete(':id/channels/:channel')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a contact channel from a recipient' })
  @ApiResponse({ status: 204, description: 'Channel removed' })
  @ApiResponse({ status: 404, description: 'Recipient not found' })
  async removeChannel(
    @Param('id') id: string,
    @Param('channel') channel: string,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<void> {
    await this.recipientService.removeChannel(id, channel, actor.id);
  }

  /**
   * Bulk-imports recipients from a CSV file.
   *
   * The file must be sent as `multipart/form-data` with a field named `file`.
   * Expected CSV format:
   * ```
   * firstName,lastName,preferredLanguageCode
   * Amina,Benali,fr
   * Jan,Peeters,nl
   * ```
   *
   * @param file - Uploaded CSV file.
   */
  @Post('import')
  @ApiOperation({ summary: 'Bulk import recipients from CSV' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 201, description: 'Import result with count and errors' })
  @UseInterceptors(FileInterceptor('file'))
  importCsv(@UploadedFile() file: Express.Multer.File): Promise<CsvImportResult> {
    return this.recipientService.importFromCsv(file.buffer);
  }
}
