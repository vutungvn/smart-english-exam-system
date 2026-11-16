import { applyDecorators, SetMetadata } from '@nestjs/common';
import { RoleCode } from '../constants/roles.js';
import { ApiErrors } from '../swagger/api-errors.decorator.js';
import { ErrorCode } from '../errors/error-codes.js';

export const ROLES_KEY = 'roles';

/**
 * Chỉ cho các vai trò liệt kê gọi route (đặt trên controller hoặc method; method ghi đè controller).
 * RolesGuard đọc metadata này. Kèm sẵn ví dụ lỗi 403 cho Swagger.
 */

export const Roles = (...roles: RoleCode[]): MethodDecorator & ClassDecorator =>
  applyDecorators(SetMetadata(ROLES_KEY, roles), ApiErrors(ErrorCode.FORBIDDEN));
