import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
  Query,
  UseGuards,
  Put,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { StudentProfilesService } from './student-profiles.service';
import { CreateStudentProfileDto } from './dto/create-student-profile.dto';
import { FindAllStudentProfilesDto } from './dto/find-all-student-profiles.dto';
import { AccessTokenGuard } from '../commons/guards';
import { Roles } from '../commons/decorators';
import { UserRole } from '@prisma/client';
import type { JwtPayload } from '../commons/types';
import { RolesGuard } from '../commons/guards/roles.guard';
import { GetCurrentUser } from '../commons/decorators/get-current-user.decorator';
import { UpdateStudentProfileDto } from './dto/update-student-profile.dto';

@ApiTags('Student Profiles')
@ApiBearerAuth()
@UseGuards(AccessTokenGuard, RolesGuard)
@Controller('student-profiles')
export class StudentProfilesController {
  constructor(private readonly service: StudentProfilesService) {}

  @Post()
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.MANAGER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a student profile for an existing user' })
  @ApiResponse({ status: 201, description: 'Profile created.' })
  create(
    @Body() dto: CreateStudentProfileDto,
    @GetCurrentUser() user: JwtPayload,
  ) {
    return this.service.create(dto, user);
  }

  @Get()
  @Roles(
    UserRole.PLATFORM_ADMIN,
    UserRole.MANAGER,
    UserRole.ADMIN,
    UserRole.TEACHER,
  )
  @ApiOperation({
    summary: 'Get all student profiles with pagination and search',
  })
  findAll(
    @Query() query: FindAllStudentProfilesDto,
    @GetCurrentUser() user: JwtPayload,
  ) {
    return this.service.findAll(query, user);
  }

  @Get(':userId')
  @Roles(
    UserRole.PLATFORM_ADMIN,
    UserRole.MANAGER,
    UserRole.ADMIN,
    UserRole.TEACHER,
    UserRole.STUDENT,
  )
  @ApiOperation({ summary: 'Get student profile by User ID' })
  findOne(
    @Param('userId', ParseIntPipe) userId: number,
    @GetCurrentUser() user: JwtPayload,
  ) {
    return this.service.findOne(userId, user);
  }

  @Put(':userId')
  @Roles(
    UserRole.PLATFORM_ADMIN,
    UserRole.MANAGER,
    UserRole.ADMIN,
    UserRole.STUDENT,
  )
  @ApiOperation({
    summary: 'Update student profile (Students can only update personal info)',
  })
  update(
    @Param('userId', ParseIntPipe) userId: number,
    @Body() dto: UpdateStudentProfileDto,
    @GetCurrentUser() user: JwtPayload,
  ) {
    return this.service.update(userId, dto, user);
  }

  @Delete(':userId')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.MANAGER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete student profile' })
  remove(
    @Param('userId', ParseIntPipe) userId: number,
    @GetCurrentUser() user: JwtPayload,
  ) {
    return this.service.remove(userId, user);
  }
}
