-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_projects" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "color" TEXT NOT NULL DEFAULT '#10b981',
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "subgroupId" TEXT NOT NULL,
    "templateId" TEXT,
    CONSTRAINT "projects_subgroupId_fkey" FOREIGN KEY ("subgroupId") REFERENCES "subgroups" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "projects_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "templates" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_projects" ("color", "createdAt", "description", "id", "name", "order", "subgroupId", "templateId", "updatedAt") SELECT "color", "createdAt", "description", "id", "name", "order", "subgroupId", "templateId", "updatedAt" FROM "projects";
DROP TABLE "projects";
ALTER TABLE "new_projects" RENAME TO "projects";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
