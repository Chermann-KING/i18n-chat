import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { TAuthTokens, TLogin, TRefreshToken } from '@i18n-chat/dto';
import { LoginSchema, RefreshTokenSchema } from '@i18n-chat/dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { JwtRefreshGuard } from '../../common/guards/jwt-refresh.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import type { AuthenticatedUser } from './interfaces/jwt-payload.interface';
import { AuthService } from './auth.service';

/**
 * Handles authentication — login, token rotation, and logout.
 *
 * All routes are prefixed with `/api/v1/auth` via the global prefix + controller path.
 */
@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Authenticates a staff member and returns a JWT token pair.
   *
   * @param body - Validated login credentials.
   */
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiResponse({ status: 200, description: 'Returns access + refresh token pair' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  login(@Body(new ZodValidationPipe(LoginSchema)) body: TLogin): Promise<TAuthTokens> {
    return this.authService.login(body.email, body.password);
  }

  /**
   * Rotates the refresh token and issues a fresh token pair.
   *
   * The incoming refresh token is validated by {@link JwtRefreshGuard}.
   *
   * @param body - Validated request containing the refresh token.
   */
  @Public()
  @UseGuards(JwtRefreshGuard)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rotate refresh token and issue new token pair' })
  @ApiResponse({ status: 200, description: 'Returns new access + refresh token pair' })
  @ApiResponse({ status: 401, description: 'Refresh token invalid, expired, or revoked' })
  refresh(
    @Body(new ZodValidationPipe(RefreshTokenSchema)) body: TRefreshToken,
  ): Promise<TAuthTokens> {
    return this.authService.refreshTokens(body.refreshToken);
  }

  /**
   * Revokes all active refresh tokens for the authenticated user.
   *
   * @param user - The currently authenticated user (from `request.user`).
   */
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoke all active refresh tokens (logout)' })
  @ApiResponse({ status: 204, description: 'Successfully logged out' })
  async logout(@CurrentUser() user: AuthenticatedUser): Promise<void> {
    await this.authService.logout(user.id);
  }
}
