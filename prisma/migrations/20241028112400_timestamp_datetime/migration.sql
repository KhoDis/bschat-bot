/*
  Warnings:

  - You are about to alter the column `timestamp` on the `MusicEntry` table. The data in that column could be lost. The data in that column will be cast from `Int` to `DateTime`.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_MusicEntry" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "fileId" TEXT NOT NULL,
    "timestamp" DATETIME NOT NULL,
    "userId" INTEGER NOT NULL,
    CONSTRAINT "MusicEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_MusicEntry" ("fileId", "id", "timestamp", "userId") SELECT "fileId", "id", "timestamp", "userId" FROM "MusicEntry";
DROP TABLE "MusicEntry";
ALTER TABLE "new_MusicEntry" RENAME TO "MusicEntry";
CREATE UNIQUE INDEX "MusicEntry_userId_key" ON "MusicEntry"("userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
