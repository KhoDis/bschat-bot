/*
  Warnings:

  - You are about to drop the column `hintChatId` on the `MusicSubmission` table. All the data in the column will be lost.
  - You are about to drop the column `hintMessageId` on the `MusicSubmission` table. All the data in the column will be lost.
  - Added the required column `uploadChatId` to the `MusicSubmission` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "MusicSubmission" DROP COLUMN "hintChatId",
DROP COLUMN "hintMessageId",
ADD COLUMN     "uploadChatId" BIGINT NOT NULL,
ADD COLUMN     "uploadHintMessageId" BIGINT;
