-- CreateTable
CREATE TABLE "ConversionHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sourceFile" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "jobsConverted" TEXT NOT NULL,
    "airflowVersion" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
