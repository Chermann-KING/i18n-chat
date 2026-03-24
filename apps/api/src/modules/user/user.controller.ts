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
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { TCreateUser, TUpdateUser, TUserResponse } from '@i18n-chat/dto';
import { CreateUserSchema, UpdateUserSchema } from '@i18n-chat/dto';
import { UserRole } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { UserService } from './user.service';

/**
 * Manages staff user accounts.
 *
 * All endpoints are admin-only.
 * Routes are prefixed `/api/v1/users` via the global API prefix.
 */
@ApiTags('users')
@Controller('users')
@Roles(UserRole.ADMIN)
export class UserController {
  constructor(private readonly userService: UserService) {}

  /**
   * Returns all staff users.
   */
  @Get()
  @ApiOperation({ summary: 'List all staff users (admin only)' })
  @ApiResponse({ status: 200, description: 'Array of user objects' })
  findAll(): Promise<TUserResponse[]> {
    return this.userService.findAll();
  }

  /**
   * Returns a single user by UUID.
   *
   * @param id - User UUID.
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID (admin only)' })
  @ApiResponse({ status: 200, description: 'User object' })
  @ApiResponse({ status: 404, description: 'User not found' })
  findOne(@Param('id') id: string): Promise<TUserResponse> {
    return this.userService.findById(id);
  }

  /**
   * Creates a new staff user.
   *
   * @param body - Validated creation payload.
   * @param actor - The authenticated admin performing the action.
   */
  @Post()
  @ApiOperation({ summary: 'Create a staff user (admin only)' })
  @ApiResponse({ status: 201, description: 'Created user' })
  create(
    @Body(new ZodValidationPipe(CreateUserSchema)) body: TCreateUser,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<TUserResponse> {
    return this.userService.create(body, actor.id);
  }

  /**
   * Updates an existing staff user.
   *
   * @param id - UUID of the user to update.
   * @param body - Validated update payload.
   * @param actor - The authenticated admin performing the action.
   */
  @Patch(':id')
  @ApiOperation({ summary: 'Update a staff user (admin only)' })
  @ApiResponse({ status: 200, description: 'Updated user' })
  @ApiResponse({ status: 404, description: 'User not found' })
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateUserSchema)) body: TUpdateUser,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<TUserResponse> {
    return this.userService.update(id, body, actor.id);
  }

  /**
   * Soft-deletes a staff user (sets `isActive = false`).
   *
   * @param id - UUID of the user to deactivate.
   * @param actor - The authenticated admin performing the action.
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Deactivate a staff user (admin only)' })
  @ApiResponse({ status: 204, description: 'User deactivated' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async delete(@Param('id') id: string, @CurrentUser() actor: AuthenticatedUser): Promise<void> {
    await this.userService.delete(id, actor.id);
  }
}
