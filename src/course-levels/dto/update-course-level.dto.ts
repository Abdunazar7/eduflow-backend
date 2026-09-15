import { PartialType } from '@nestjs/swagger';
import { CreateCourseLevelDto } from './create-course-level.dto';

export class UpdateCourseLevelDto extends PartialType(CreateCourseLevelDto) {}
