import { User, Role } from '../types/domain';
import { IUserRepository } from '../repositories/interfaces';
import { ForbiddenError } from '../errors/AppError';

export class AuthService {
  constructor(private userRepo: IUserRepository) {}

  /**
   * Resolves or provisions a user account based on verified identity.
   * New users are strictly assigned the 'student' role by default.
   * Staff/Admin roles can only be granted through protected administrative operations.
   */
  async resolveUser(
    uid: string,
    tokenData?: { email?: string; displayName?: string }
  ): Promise<User> {
    const existing = await this.userRepo.findByUid(uid);
    const now = new Date().toISOString();

    if (existing) {
      // Update profile info if changed
      let shouldUpdate = false;
      if (tokenData?.email && existing.email !== tokenData.email) {
        existing.email = tokenData.email;
        shouldUpdate = true;
      }
      if (tokenData?.displayName && existing.displayName !== tokenData.displayName) {
        existing.displayName = tokenData.displayName;
        shouldUpdate = true;
      }
      if (shouldUpdate) {
        existing.updatedAt = now;
        return await this.userRepo.createOrUpdate(existing);
      }
      return existing;
    }

    const newUser: User = {
      uid,
      email: tokenData?.email,
      displayName: tokenData?.displayName,
      role: 'student', // Fail-safe default
      createdAt: now,
      updatedAt: now,
    };

    return await this.userRepo.createOrUpdate(newUser);
  }

  async getUser(uid: string): Promise<User | null> {
    return await this.userRepo.findByUid(uid);
  }

  async setUserRole(targetUid: string, newRole: Role, actorRole: Role): Promise<User> {
    if (actorRole !== 'admin') {
      throw new ForbiddenError('Only administrators can modify user roles');
    }

    const user = await this.userRepo.findByUid(targetUid);
    if (!user) {
      throw new Error(`User ${targetUid} not found`);
    }

    user.role = newRole;
    user.updatedAt = new Date().toISOString();
    return await this.userRepo.createOrUpdate(user);
  }
}
