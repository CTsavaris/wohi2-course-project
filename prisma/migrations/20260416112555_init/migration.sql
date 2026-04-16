/*
  Warnings:

  - You are about to drop the column `answers` on the `quizzes` table. All the data in the column will be lost.
  - Added the required column `answer` to the `quizzes` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `quizzes` DROP COLUMN `answers`,
    ADD COLUMN `answer` VARCHAR(255) NOT NULL;
