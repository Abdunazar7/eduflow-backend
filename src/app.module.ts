import { Module } from '@nestjs/common';
import { ConditionalModule, ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

import { validateEnv } from './commons/config/env.validation';
import { PER_MINUTE, phoneAndIp, sessionOrIp } from './commons/config/throttle';
import { AccessTokenGuard, RolesGuard } from './commons/guards';

import { AuthModule } from './auth/auth.module';
import { HealthModule } from './health/health.module';
import { NotificationModule } from './notification/notification.module';
import { FilesModule } from './files/files.module';
import { TelegramModule } from './telegram/telegram.module';
import { UsersModule } from './users/users.module';
import { TenantsModule } from './tenants/tenants.module';
import { SubscriptionPlansModule } from './subscription-plans/subscription-plans.module';
import { TenantSubscriptionsModule } from './tenant-subscriptions/tenant-subscriptions.module';
import { StudentProfilesModule } from './student-profiles/student-profiles.module';
import { TeacherProfilesModule } from './teacher-profiles/teacher-profiles.module';
import { StaffProfilesModule } from './staff-profiles/staff-profiles.module';
import { BranchesModule } from './branches/branches.module';
import { RoomsModule } from './rooms/rooms.module';
import { CoursesModule } from './courses/courses.module';
import { CourseLevelsModule } from './course-levels/course-levels.module';
import { GroupsModule } from './groups/groups.module';
import { GroupSchedulesModule } from './group-schedules/group-schedules.module';
import { EnrollmentsModule } from './enrollments/enrollments.module';
import { LessonsModule } from './lessons/lessons.module';
import { AttendanceModule } from './attendance/attendance.module';
import { HomeworksModule } from './homeworks/homeworks.module';
import { HomeworkSubmissionsModule } from './homework-submissions/homework-submissions.module';
import { LeadStatusesModule } from './lead-statuses/lead-statuses.module';
import { LeadsModule } from './leads/leads.module';
import { TransactionsModule } from './transactions/transactions.module';
import { TeacherSettlementsModule } from './teacher-settlements/teacher-settlements.module';
import { SmsLogsModule } from './sms-logs/sms-logs.module';
import { SystemSettingsModule } from './system-settings/system-settings.module';
import { ReportsModule } from './reports/reports.module';
import { AichatModule } from './aichat/aichat.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),

    // Without this, every @Cron in the app is silently never registered.
    ScheduleModule.forRoot(),

    // "default" counts per session (per IP when signed out); "account"
    // counts per phone number per network and is only tightened on the
    // auth routes, so its high baseline keeps it out of the way elsewhere.
    ThrottlerModule.forRoot({
      throttlers: [
        { name: 'default', ttl: PER_MINUTE, limit: 300, getTracker: sessionOrIp },
        { name: 'account', ttl: PER_MINUTE, limit: 10_000, getTracker: phoneAndIp },
      ],
      errorMessage: 'Too many requests. Please wait a minute and try again.',
    }),

    AuthModule,
    HealthModule,
    NotificationModule,
    FilesModule,
    TelegramModule,
    UsersModule,
    TenantsModule,
    SubscriptionPlansModule,
    TenantSubscriptionsModule,
    StudentProfilesModule,
    TeacherProfilesModule,
    StaffProfilesModule,
    BranchesModule,
    RoomsModule,
    CoursesModule,
    CourseLevelsModule,
    GroupsModule,
    GroupSchedulesModule,
    EnrollmentsModule,
    LessonsModule,
    AttendanceModule,
    HomeworksModule,
    HomeworkSubmissionsModule,
    LeadStatusesModule,
    LeadsModule,
    TransactionsModule,
    TeacherSettlementsModule,
    SmsLogsModule,
    SystemSettingsModule,
    ReportsModule,
    // Off unless AI_CHAT_ENABLED=true, so the assistant exposes nothing and
    // costs nothing until you configure your own Groq key.
    ConditionalModule.registerWhen(
      AichatModule,
      (env: NodeJS.ProcessEnv) => env.AI_CHAT_ENABLED === 'true',
    ),
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    // Authentication is now deny-by-default for the whole API. Routes that
    // must stay open opt out explicitly with @Public(). Three controllers had
    // already shipped unauthenticated because the old model was opt-in.
    { provide: APP_GUARD, useClass: AccessTokenGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
