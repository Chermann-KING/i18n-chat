import { Body, Controller, Get, HttpCode, HttpStatus, Patch } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  ChangePasswordSchema,
  UpdateNotificationsSchema,
  UpdateProfileSchema,
} from '@i18n-chat/dto';
import type {
  TChangePassword,
  TUpdateNotifications,
  TUpdateProfile,
  TUserResponse,
} from '@i18n-chat/dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { UserService } from './user.service';

/**
 * Self-service endpoints for the authenticated user.
 *
 * Unlike {@link UserController} (admin-only), these routes are available to
 * any authenticated staff member acting on their own account.
 */
@ApiTags('me')
@Controller('users/me')
export class MeController {
  constructor(private readonly userService: UserService) {}

  /**
   * Returns the authenticated user's own profile.
   */
  @Get()
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'User profile' })
  getMe(@CurrentUser() user: AuthenticatedUser): Promise<TUserResponse> {
    return this.userService.findById(user.id);
  }

  /**
   * Updates the authenticated user's first name, last name, or preferred language.
   *
   * @param body - Validated profile update payload.
   * @param user - The authenticated staff member.
   */
  @Patch('profile')
  @ApiOperation({ summary: 'Update own profile (name, language)' })
  @ApiResponse({ status: 200, description: 'Updated profile' })
  updateProfile(
    @Body(new ZodValidationPipe(UpdateProfileSchema)) body: TUpdateProfile,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<TUserResponse> {
    return this.userService.updateProfile(user.id, body);
  }

  /**
   * Changes the authenticated user's password.
   * Requires the current password to verify identity.
   *
   * @param body - Current password + new password.
   * @param user - The authenticated staff member.
   */
  @Patch('password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change own password' })
  @ApiResponse({ status: 200, description: 'Password changed' })
  @ApiResponse({ status: 422, description: 'Current password is incorrect' })
  changePassword(
    @Body(new ZodValidationPipe(ChangePasswordSchema)) body: TChangePassword,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<TUserResponse> {
    return this.userService.changePassword(user.id, body);
  }

  /**
   * Updates the authenticated user's notification preferences.
   *
   * @param body - Notification preference payload.
   * @param user - The authenticated staff member.
   */
  @Patch('notifications')
  @ApiOperation({ summary: 'Update notification preferences' })
  @ApiResponse({ status: 200, description: 'Preferences updated' })
  updateNotifications(
    @Body(new ZodValidationPipe(UpdateNotificationsSchema)) body: TUpdateNotifications,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<TUserResponse> {
    return this.userService.updateNotifications(user.id, body);
  }
}
