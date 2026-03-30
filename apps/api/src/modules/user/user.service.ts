import { Injectable } from '@nestjs/common';
import { AppException, NotFoundException } from '@i18n-chat/domain';
import type {
  TChangePassword,
  TCreateUser,
  TUpdateNotifications,
  TUpdateProfile,
  TUpdateUser,
  TUserResponse,
} from '@i18n-chat/dto';
import * as argon2 from 'argon2';
import type { User } from '@prisma/client';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

/**
 * Business logic for staff user management.
 *
 * All mutating operations are restricted to admins via {@link UserController}.
 * Passwords are hashed with argon2 before persistence; the raw hash is never
 * exposed in responses.
 */
@Injectable()
export class UserService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Returns all staff users, ordered by creation date (newest first).
   */
  async findAll(): Promise<TUserResponse[]> {
    const users = await this.prisma.user.findMany({ orderBy: { createdAt: 'desc' } });
    return users.map((u) => this.toResponse(u));
  }

  /**
   * Returns a single user by UUID.
   *
   * @param id - User UUID.
   * @throws {NotFoundException} When no user with the given ID exists.
   */
  async findById(id: string): Promise<TUserResponse> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User', id);
    return this.toResponse(user);
  }

  /**
   * Creates a new staff user with a hashed password.
   *
   * @param data - Validated user creation payload.
   * @param actorId - UUID of the admin performing the action.
   * @returns The created user (without password hash).
   */
  async create(data: TCreateUser, actorId: string): Promise<TUserResponse> {
    const passwordHash = await argon2.hash(data.password);
    const user = await this.prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
        role: (data.role as unknown as UserRole) ?? UserRole.SENDER,
        preferredLanguageCode: data.preferredLanguageCode ?? 'fr',
      },
    });

    await this.audit.log({
      userId: actorId,
      action: 'user.created',
      entityType: 'User',
      entityId: user.id,
      metadata: { email: user.email, role: user.role },
    });

    return this.toResponse(user);
  }

  /**
   * Updates an existing staff user.
   *
   * When a new password is provided it is hashed before storage.
   *
   * @param id - UUID of the user to update.
   * @param data - Validated update payload (all fields optional).
   * @param actorId - UUID of the admin performing the action.
   * @returns The updated user.
   * @throws {NotFoundException} When no user with the given ID exists.
   */
  async update(id: string, data: TUpdateUser, actorId: string): Promise<TUserResponse> {
    await this.findById(id);

    const updateData: Partial<{
      email: string;
      passwordHash: string;
      role: UserRole;
      preferredLanguageCode: string;
      isActive: boolean;
    }> = {};

    if (data.email !== undefined) updateData.email = data.email;
    if (data.role !== undefined) updateData.role = data.role as unknown as UserRole;
    if (data.preferredLanguageCode !== undefined)
      updateData.preferredLanguageCode = data.preferredLanguageCode;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.password !== undefined) updateData.passwordHash = await argon2.hash(data.password);

    const user = await this.prisma.user.update({ where: { id }, data: updateData });

    await this.audit.log({
      userId: actorId,
      action: 'user.updated',
      entityType: 'User',
      entityId: id,
      metadata: { changedFields: Object.keys(updateData) },
    });

    return this.toResponse(user);
  }

  /**
   * Soft-deletes a user by setting `isActive = false`.
   *
   * Hard deletion is avoided because users are referenced by dispatches and
   * audit logs via foreign keys.
   *
   * @param id - UUID of the user to deactivate.
   * @param actorId - UUID of the admin performing the action.
   * @throws {NotFoundException} When no user with the given ID exists.
   */
  async delete(id: string, actorId: string): Promise<void> {
    await this.findById(id);
    await this.prisma.user.update({ where: { id }, data: { isActive: false } });

    await this.audit.log({
      userId: actorId,
      action: 'user.deleted',
      entityType: 'User',
      entityId: id,
    });
  }

  /**
   * Updates the authenticated user's own profile (name, preferred language).
   *
   * @param id - UUID of the authenticated user.
   * @param data - Validated profile update payload.
   */
  async updateProfile(id: string, data: TUpdateProfile): Promise<TUserResponse> {
    const user = await this.prisma.user.update({
      where: { id },
      data: {
        ...(data.firstName !== undefined && { firstName: data.firstName }),
        ...(data.lastName !== undefined && { lastName: data.lastName }),
        ...(data.preferredLanguageCode !== undefined && {
          preferredLanguageCode: data.preferredLanguageCode,
        }),
      },
    });

    await this.audit.log({
      userId: id,
      action: 'user.profile_updated',
      entityType: 'User',
      entityId: id,
      metadata: { changedFields: Object.keys(data) },
    });

    return this.toResponse(user);
  }

  /**
   * Changes the authenticated user's password after verifying the current one.
   *
   * @param id - UUID of the authenticated user.
   * @param data - Current password (for verification) and new password.
   * @throws {AppException} When the current password is incorrect.
   */
  async changePassword(id: string, data: TChangePassword): Promise<TUserResponse> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id } });

    const isValid = await argon2.verify(user.passwordHash, data.currentPassword);
    if (!isValid) {
      throw new AppException('Current password is incorrect.', 'INVALID_CURRENT_PASSWORD', { id });
    }

    const passwordHash = await argon2.hash(data.newPassword);
    const updated = await this.prisma.user.update({ where: { id }, data: { passwordHash } });

    await this.audit.log({
      userId: id,
      action: 'user.password_changed',
      entityType: 'User',
      entityId: id,
    });

    return this.toResponse(updated);
  }

  /**
   * Updates the authenticated user's notification preferences.
   *
   * @param id - UUID of the authenticated user.
   * @param data - Notification preference payload.
   */
  async updateNotifications(id: string, data: TUpdateNotifications): Promise<TUserResponse> {
    const user = await this.prisma.user.update({
      where: { id },
      data: { notifyOnFailure: data.notifyOnFailure },
    });

    await this.audit.log({
      userId: id,
      action: 'user.notifications_updated',
      entityType: 'User',
      entityId: id,
      metadata: { notifyOnFailure: data.notifyOnFailure },
    });

    return this.toResponse(user);
  }

  /**
   * Maps a Prisma `User` record to the API response shape.
   *
   * - Converts `Date` fields to ISO 8601 strings.
   * - Omits the password hash.
   * - Casts the Prisma `UserRole` enum to the domain enum type.
   */
  private toResponse(user: User): TUserResponse {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName ?? null,
      lastName: user.lastName ?? null,
      role: user.role as unknown as TUserResponse['role'],
      preferredLanguageCode: user.preferredLanguageCode,
      notifyOnFailure: user.notifyOnFailure,
      isActive: user.isActive,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }
}
