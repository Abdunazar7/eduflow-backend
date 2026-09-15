-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "link" TEXT;

-- AlterTable
ALTER TABLE "Otp" ADD COLUMN     "attempts" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
-- Rename, not drop + add: a drop would destroy every payment status.
ALTER TABLE "Transaction" RENAME COLUMN "status1" TO "status";

-- CreateIndex
CREATE INDEX "TenantSubscription_tenantId_idx" ON "TenantSubscription"("tenantId");

-- CreateIndex
CREATE INDEX "TenantSubscription_planId_idx" ON "TenantSubscription"("planId");

-- CreateIndex
CREATE INDEX "User_tenantId_role_idx" ON "User"("tenantId", "role");

-- CreateIndex
CREATE INDEX "Branch_tenantId_idx" ON "Branch"("tenantId");

-- CreateIndex
CREATE INDEX "Room_branchId_idx" ON "Room"("branchId");

-- CreateIndex
CREATE INDEX "Course_tenantId_idx" ON "Course"("tenantId");

-- CreateIndex
CREATE INDEX "CourseLevel_courseId_idx" ON "CourseLevel"("courseId");

-- CreateIndex
CREATE INDEX "Group_tenantId_idx" ON "Group"("tenantId");

-- CreateIndex
CREATE INDEX "Group_teacherId_idx" ON "Group"("teacherId");

-- CreateIndex
CREATE INDEX "Group_supportTeacherId_idx" ON "Group"("supportTeacherId");

-- CreateIndex
CREATE INDEX "Group_courseLevelId_idx" ON "Group"("courseLevelId");

-- CreateIndex
CREATE INDEX "Group_branchId_idx" ON "Group"("branchId");

-- CreateIndex
CREATE INDEX "GroupSchedule_groupId_idx" ON "GroupSchedule"("groupId");

-- CreateIndex
CREATE INDEX "Enrollment_studentId_idx" ON "Enrollment"("studentId");

-- CreateIndex
CREATE INDEX "Enrollment_groupId_idx" ON "Enrollment"("groupId");

-- CreateIndex
CREATE INDEX "Lesson_groupId_date_idx" ON "Lesson"("groupId", "date");

-- CreateIndex
CREATE INDEX "Lesson_teacherId_idx" ON "Lesson"("teacherId");

-- CreateIndex
CREATE INDEX "Attendance_studentId_idx" ON "Attendance"("studentId");

-- CreateIndex
CREATE INDEX "Homework_lessonId_idx" ON "Homework"("lessonId");

-- CreateIndex
CREATE INDEX "HomeworkSubmission_homeworkId_idx" ON "HomeworkSubmission"("homeworkId");

-- CreateIndex
CREATE INDEX "HomeworkSubmission_studentId_idx" ON "HomeworkSubmission"("studentId");

-- CreateIndex
CREATE INDEX "LeadStatus_tenantId_idx" ON "LeadStatus"("tenantId");

-- CreateIndex
CREATE INDEX "Lead_tenantId_createdAt_idx" ON "Lead"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "Lead_statusId_idx" ON "Lead"("statusId");

-- CreateIndex
CREATE INDEX "Lead_assignedTo_idx" ON "Lead"("assignedTo");

-- CreateIndex
CREATE INDEX "Transaction_tenantId_createdAt_idx" ON "Transaction"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "Transaction_userId_idx" ON "Transaction"("userId");

-- CreateIndex
CREATE INDEX "TeacherSettlement_tenantId_idx" ON "TeacherSettlement"("tenantId");

-- CreateIndex
CREATE INDEX "TeacherSettlement_teacherId_idx" ON "TeacherSettlement"("teacherId");

-- CreateIndex
CREATE INDEX "SmsLog_tenantId_idx" ON "SmsLog"("tenantId");


-- Normalise casing. Two TransactionType enums ("INCOME" and "income") both
-- wrote to this table; the API now writes uppercase only.
UPDATE "Transaction" SET "type" = UPPER("type") WHERE "type" <> UPPER("type");
UPDATE "Transaction" SET "status" = UPPER("status") WHERE "status" IS NOT NULL AND "status" <> UPPER("status");
