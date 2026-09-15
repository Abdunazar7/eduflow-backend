/*
  Warnings:

  - The values [TENANT_OWNER,STAFF] on the enum `UserRole` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `colorCode` on the `TeacherProfile` table. All the data in the column will be lost.
  - You are about to drop the column `email` on the `User` table. All the data in the column will be lost.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "UserRole_new" AS ENUM ('PLATFORM_ADMIN', 'MANAGER', 'ADMIN', 'TEACHER', 'STUDENT');
ALTER TABLE "User" ALTER COLUMN "role" TYPE "UserRole_new" USING ("role"::text::"UserRole_new");
ALTER TYPE "UserRole" RENAME TO "UserRole_old";
ALTER TYPE "UserRole_new" RENAME TO "UserRole";
DROP TYPE "public"."UserRole_old";
COMMIT;

-- DropIndex
DROP INDEX "User_email_key";

-- AlterTable
ALTER TABLE "TeacherProfile" DROP COLUMN "colorCode",
ADD COLUMN     "title" TEXT;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "email";
