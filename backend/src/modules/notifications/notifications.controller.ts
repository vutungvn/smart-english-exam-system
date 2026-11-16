import { Controller, Get, HttpCode, HttpStatus, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto.js';
import { ErrorCode } from '../../common/errors/error-codes.js';
import { UuidParam } from '../../common/pipes/uuid-param.pipe.js';
import {
  ApiEnvelope,
  ApiNullEnvelope,
  ApiPaginatedEnvelope,
} from '../../common/swagger/api-envelope.decorator.js';
import { ApiErrors } from '../../common/swagger/api-errors.decorator.js';
import type { WithMeta } from '../../common/types/api-response.js';
import type { AuthUser } from '../../common/types/auth-user.js';
import { NotificationsService } from './notifications.service.js';
import { NotificationItem, UnreadNotificationCount } from './notifications.types.js';

// Mọi vai trò đã đăng nhập; thông báo mới phát qua Socket.IO namespace /notifications (sự kiện
// "notification"), các route này để xem lại trong chuông và đánh dấu đã đọc
@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('me/notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách thông báo của tôi, mới nhất trước' })
  @ApiPaginatedEnvelope(NotificationItem)
  listNotifications(
    @CurrentUser() user: AuthUser,
    @Query() query: PaginationQueryDto,
  ): Promise<WithMeta<NotificationItem[]>> {
    return this.notifications.list(user.id, query);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Số thông báo chưa đọc (chấm đỏ trên chuông)' })
  @ApiEnvelope(UnreadNotificationCount)
  async getUnreadNotificationCount(
    @CurrentUser() user: AuthUser,
  ): Promise<UnreadNotificationCount> {
    return { count: await this.notifications.unreadCount(user.id) };
  }

  @Post('read-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Đánh dấu mọi thông báo là đã đọc' })
  @ApiNullEnvelope()
  async markAllNotificationsRead(@CurrentUser() user: AuthUser): Promise<null> {
    await this.notifications.markAllRead(user.id);
    return null;
  }

  @Post(':id/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Đánh dấu một thông báo là đã đọc',
    description: 'Chỉ thông báo của chính mình; đã đọc rồi thì giữ nguyên.',
  })
  @ApiNullEnvelope()
  @ApiErrors(ErrorCode.NOTIFICATION_NOT_FOUND)
  async markNotificationRead(
    @Param('id', UuidParam(ErrorCode.NOTIFICATION_NOT_FOUND)) id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<null> {
    await this.notifications.markRead(user.id, id);
    return null;
  }
}
