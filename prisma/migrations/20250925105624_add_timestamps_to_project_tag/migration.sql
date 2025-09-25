/*
  Warnings:

  - Added the required column `updatedAt` to the `project_tags` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_project_tags" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "project_tags_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "project_tags_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "tags" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_project_tags" ("id", "projectId", "tagId") SELECT "id", "projectId", "tagId" FROM "project_tags";
DROP TABLE "project_tags";
ALTER TABLE "new_project_tags" RENAME TO "project_tags";
CREATE UNIQUE INDEX "project_tags_projectId_tagId_key" ON "project_tags"("projectId", "tagId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
