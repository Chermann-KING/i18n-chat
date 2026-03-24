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
  Put,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type {
  TCreateTemplate,
  TCreateTranslation,
  TTemplateResponse,
  TTranslationResponse,
  TUpdateTemplate,
  TUpdateTranslation,
} from '@i18n-chat/dto';
import {
  CreateTemplateSchema,
  CreateTranslationSchema,
  UpdateTemplateSchema,
  UpdateTranslationSchema,
} from '@i18n-chat/dto';
import type { PagedResult } from '@i18n-chat/domain';
import { UserRole } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { TemplateService } from './template.service';

/**
 * Manages message templates and their per-language translations.
 *
 * Routes are prefixed `/api/v1/templates` via the global API prefix.
 */
@ApiTags('templates')
@Controller('templates')
export class TemplateController {
  constructor(private readonly templateService: TemplateService) {}

  /**
   * Returns a paginated list of templates.
   *
   * @param category - Filter by category.
   * @param isActive - Filter by active state.
   * @param page - Page number (1-based).
   * @param limit - Results per page.
   */
  @Get()
  @ApiOperation({ summary: 'List templates (paginated)' })
  @ApiResponse({ status: 200, description: 'Paged template list' })
  findAll(
    @Query('category') category?: string,
    @Query('isActive') isActive?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<PagedResult<TTemplateResponse>> {
    return this.templateService.findAll({
      category,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
      page: page !== undefined ? parseInt(page, 10) : undefined,
      limit: limit !== undefined ? parseInt(limit, 10) : undefined,
      includeVariables: true,
    });
  }

  /**
   * Returns a single template by UUID with variables and translations.
   *
   * @param id - Template UUID.
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get template by ID' })
  @ApiResponse({ status: 200, description: 'Template with variables and translations' })
  @ApiResponse({ status: 404, description: 'Template not found' })
  findOne(@Param('id') id: string): Promise<TTemplateResponse> {
    return this.templateService.findById(id);
  }

  /**
   * Creates a new template (admin only).
   *
   * @param body - Validated creation payload.
   * @param user - The authenticated admin user creating the template.
   */
  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a template (admin only)' })
  @ApiResponse({ status: 201, description: 'Created template' })
  create(
    @Body(new ZodValidationPipe(CreateTemplateSchema)) body: TCreateTemplate,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<TTemplateResponse> {
    return this.templateService.create(body, user.id);
  }

  /**
   * Updates a template's category or active state (admin only).
   *
   * @param id - UUID of the template to update.
   * @param body - Validated update payload.
   */
  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update a template (admin only)' })
  @ApiResponse({ status: 200, description: 'Updated template' })
  @ApiResponse({ status: 404, description: 'Template not found' })
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateTemplateSchema)) body: TUpdateTemplate,
  ): Promise<TTemplateResponse> {
    return this.templateService.update(id, body);
  }

  /**
   * Soft-deletes a template (admin only).
   *
   * @param id - UUID of the template to deactivate.
   */
  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Deactivate a template (admin only)' })
  @ApiResponse({ status: 204, description: 'Template deactivated' })
  @ApiResponse({ status: 404, description: 'Template not found' })
  async delete(@Param('id') id: string): Promise<void> {
    await this.templateService.delete(id);
  }

  /**
   * Creates or updates a translation for a template.
   *
   * @param id - UUID of the parent template.
   * @param languageCode - ISO 639-1 code for the translation language.
   * @param body - Validated translation payload.
   */
  @Put(':id/translations/:languageCode')
  @ApiOperation({ summary: 'Upsert a template translation' })
  @ApiResponse({ status: 200, description: 'Upserted translation' })
  @ApiResponse({ status: 404, description: 'Template not found' })
  upsertTranslation(
    @Param('id') id: string,
    @Param('languageCode') languageCode: string,
    @Body(new ZodValidationPipe(CreateTranslationSchema.omit({ languageCode: true })))
    body: Omit<TCreateTranslation, 'languageCode'>,
  ): Promise<TTranslationResponse> {
    return this.templateService.upsertTranslation(id, { ...body, languageCode });
  }

  /**
   * Updates specific fields of an existing translation.
   *
   * @param id - UUID of the parent template.
   * @param languageCode - ISO 639-1 code for the translation language.
   * @param body - Partial translation fields to update.
   */
  @Patch(':id/translations/:languageCode')
  @ApiOperation({ summary: 'Partially update a template translation' })
  @ApiResponse({ status: 200, description: 'Updated translation' })
  patchTranslation(
    @Param('id') id: string,
    @Param('languageCode') languageCode: string,
    @Body(new ZodValidationPipe(UpdateTranslationSchema)) body: TUpdateTranslation,
  ): Promise<TTranslationResponse> {
    return this.templateService.upsertTranslation(id, { ...body, languageCode });
  }

  /**
   * Removes a translation from a template.
   *
   * @param id - UUID of the parent template.
   * @param languageCode - ISO 639-1 code of the translation to delete.
   */
  @Delete(':id/translations/:languageCode')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a template translation' })
  @ApiResponse({ status: 204, description: 'Translation deleted' })
  @ApiResponse({ status: 404, description: 'Template or translation not found' })
  async deleteTranslation(
    @Param('id') id: string,
    @Param('languageCode') languageCode: string,
  ): Promise<void> {
    await this.templateService.deleteTranslation(id, languageCode);
  }
}
