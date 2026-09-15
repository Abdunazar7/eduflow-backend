import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { NotificationService } from './notification.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { FindNotificationsDto } from './dto/find-notifications.dto';
import { NotificationEntity } from './entities/notification.entity';
import {
  GetCurrentUser,
  GetCurrentUserId,
  Roles,
} from '../commons/decorators';
import type { AuthUser } from '../commons/types';

/**
 * Every route acts on the signed-in user's own notifications. The user id
 * comes from the access token, never from the request — the previous version
 * took it from the query string, so anyone could read or delete anyone's.
 */
@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Post()
  @Roles(UserRole.MANAGER, UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({
    summary: 'Send a notification to someone in your organisation',
    description: 'Teachers can only notify students.',
  })
  @ApiResponse({ status: 201, type: NotificationEntity })
  create(
    @Body() dto: CreateNotificationDto,
    @GetCurrentUser() sender: AuthUser,
  ) {
    return this.notificationService.createFor(dto, sender);
  }

  @Get()
  @ApiOperation({ summary: 'My notifications, newest first' })
  findMine(
    @GetCurrentUserId() userId: number,
    @Query() query: FindNotificationsDto,
  ) {
    return this.notificationService.findForUser(userId, query);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'How many of my notifications are unread' })
  unreadCount(@GetCurrentUserId() userId: number) {
    return this.notificationService.unreadCount(userId);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark one of my notifications as read' })
  @ApiParam({ name: 'id', type: Number })
  markAsRead(
    @Param('id', ParseIntPipe) id: number,
    @GetCurrentUserId() userId: number,
  ) {
    return this.notificationService.markAsRead(id, userId);
  }

  @Post('read-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark all my notifications as read' })
  markAllAsRead(@GetCurrentUserId() userId: number) {
    return this.notificationService.markAllAsRead(userId);
  }

  // Declared before ':id' so "clear-all" is never parsed as an id. The
  // trailing :userId is accepted for older clients and ignored.
  @Delete(['clear-all', 'clear-all/:userId'])
  @ApiOperation({ summary: 'Delete all my notifications' })
  clearAll(@GetCurrentUserId() userId: number) {
    return this.notificationService.clearAll(userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete one of my notifications' })
  @ApiParam({ name: 'id', type: Number })
  remove(
    @Param('id', ParseIntPipe) id: number,
    @GetCurrentUserId() userId: number,
  ) {
    return this.notificationService.remove(id, userId);
  }
}
