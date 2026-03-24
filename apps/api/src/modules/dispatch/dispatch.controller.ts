import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CreateDispatchSchema } from '@i18n-chat/dto';
import type { TCreateDispatch, TDispatchResponse } from '@i18n-chat/dto';
import type { DispatchStatus, PagedResult, RecipientMode } from '@i18n-chat/domain';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { DispatchService } from './dispatch.service';

/**
 * Manages message dispatch creation and retrieval.
 *
 * All routes require a valid JWT (enforced globally by {@link JwtAuthGuard}).
 */
@ApiTags('dispatches')
@Controller('dispatches')
export class DispatchController {
  constructor(private readonly dispatchService: DispatchService) {}

  /**
   * Creates a new dispatch, builds all outbound messages, and enqueues them.
   *
   * @param dto - Validated dispatch creation payload.
   * @param user - The authenticated staff member creating the dispatch.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a dispatch and enqueue messages' })
  @ApiResponse({ status: 201, description: 'Dispatch created' })
  create(
    @Body(new ZodValidationPipe(CreateDispatchSchema)) dto: TCreateDispatch,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<TDispatchResponse> {
    return this.dispatchService.createDispatch(dto, user.id);
  }

  /**
   * Returns a paginated list of dispatches with optional filters.
   *
   * @param status - Filter by dispatch status.
   * @param recipientMode - Filter by recipient mode.
   * @param page - Page number (1-based, default: 1).
   * @param limit - Results per page (default: 20).
   */
  @Get()
  @ApiOperation({ summary: 'List dispatches (paginated)' })
  @ApiResponse({ status: 200, description: 'Paged dispatch list' })
  findAll(
    @Query('status') status?: DispatchStatus,
    @Query('recipientMode') recipientMode?: RecipientMode,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<PagedResult<TDispatchResponse>> {
    return this.dispatchService.findAll({
      status,
      recipientMode,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  /**
   * Returns a single dispatch by UUID, including its message count.
   *
   * @param id - Dispatch UUID.
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get dispatch by ID' })
  @ApiResponse({ status: 200, description: 'Dispatch found' })
  @ApiResponse({ status: 404, description: 'Dispatch not found' })
  findOne(@Param('id') id: string): Promise<TDispatchResponse> {
    return this.dispatchService.findById(id);
  }
}
