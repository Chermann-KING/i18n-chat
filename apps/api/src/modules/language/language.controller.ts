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
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { TCreateLanguage, TLanguageResponse, TUpdateLanguage } from '@i18n-chat/dto';
import { CreateLanguageSchema, UpdateLanguageSchema } from '@i18n-chat/dto';
import { UserRole } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { LanguageService } from './language.service';

/**
 * Handles language reference-data operations.
 *
 * All authenticated users may read; create / update / delete are admin-only.
 * Routes are prefixed `/api/v1/languages` via the global prefix.
 */
@ApiTags('languages')
@Controller('languages')
export class LanguageController {
  constructor(private readonly languageService: LanguageService) {}

  /**
   * Returns all active languages.
   *
   * @param includeInactive - Pass `'true'` to include deactivated languages.
   */
  @Get()
  @ApiOperation({ summary: 'List languages' })
  @ApiResponse({ status: 200, description: 'Array of language objects' })
  findAll(@Query('includeInactive') includeInactive?: string): Promise<TLanguageResponse[]> {
    return this.languageService.findAll(includeInactive === 'true');
  }

  /**
   * Returns a single language by its ISO code.
   *
   * @param code - ISO 639-1 code, e.g. `'fr'`.
   */
  @Get(':code')
  @ApiOperation({ summary: 'Get language by code' })
  @ApiResponse({ status: 200, description: 'Language object' })
  @ApiResponse({ status: 404, description: 'Language not found' })
  findOne(@Param('code') code: string): Promise<TLanguageResponse> {
    return this.languageService.findByCode(code);
  }

  /**
   * Creates a new language (admin only).
   *
   * @param body - Validated language payload.
   * @param actor - The authenticated admin performing the action.
   */
  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a language (admin only)' })
  @ApiResponse({ status: 201, description: 'Created language' })
  @ApiResponse({ status: 403, description: 'Forbidden — admin role required' })
  create(
    @Body(new ZodValidationPipe(CreateLanguageSchema)) body: TCreateLanguage,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<TLanguageResponse> {
    return this.languageService.create(body, actor.id);
  }

  /**
   * Updates an existing language (admin only).
   *
   * @param code - ISO code of the language to update.
   * @param body - Validated update payload.
   * @param actor - The authenticated admin performing the action.
   */
  @Patch(':code')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update a language (admin only)' })
  @ApiResponse({ status: 200, description: 'Updated language' })
  @ApiResponse({ status: 404, description: 'Language not found' })
  update(
    @Param('code') code: string,
    @Body(new ZodValidationPipe(UpdateLanguageSchema)) body: TUpdateLanguage,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<TLanguageResponse> {
    return this.languageService.update(code, body, actor.id);
  }

  /**
   * Deletes a language (admin only).
   *
   * @param code - ISO code of the language to delete.
   * @param actor - The authenticated admin performing the action.
   */
  @Delete(':code')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a language (admin only)' })
  @ApiResponse({ status: 204, description: 'Language deleted' })
  @ApiResponse({ status: 404, description: 'Language not found' })
  async delete(
    @Param('code') code: string,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<void> {
    await this.languageService.delete(code, actor.id);
  }
}
