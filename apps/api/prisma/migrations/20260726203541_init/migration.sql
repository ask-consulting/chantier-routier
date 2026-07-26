-- CreateEnum
CREATE TYPE "WorksiteStatus" AS ENUM ('upcoming', 'in_progress', 'completed', 'suspended');

-- CreateEnum
CREATE TYPE "ExpenseType" AS ENUM ('labor', 'materials', 'equipment', 'subcontracting', 'other');

-- CreateTable
CREATE TABLE "organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "worksite" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "client" TEXT,
    "address" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "plannedStartDate" TIMESTAMP(3),
    "plannedEndDate" TIMESTAMP(3),
    "status" "WorksiteStatus" NOT NULL DEFAULT 'upcoming',
    "totalBudget" DECIMAL(14,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "worksite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "worker" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "qualification" TEXT,
    "hourlyRate" DECIMAL(10,2) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "worker_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "timesheet" (
    "id" TEXT NOT NULL,
    "worksiteId" TEXT NOT NULL,
    "workerId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "hoursWorked" DECIMAL(6,2) NOT NULL,
    "present" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "timesheet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expense" (
    "id" TEXT NOT NULL,
    "worksiteId" TEXT NOT NULL,
    "type" "ExpenseType" NOT NULL DEFAULT 'other',
    "label" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "date" DATE NOT NULL,
    "supplier" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expense_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "worksite_organizationId_idx" ON "worksite"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "worksite_organizationId_code_key" ON "worksite"("organizationId", "code");

-- CreateIndex
CREATE INDEX "worker_organizationId_idx" ON "worker"("organizationId");

-- CreateIndex
CREATE INDEX "timesheet_worksiteId_idx" ON "timesheet"("worksiteId");

-- CreateIndex
CREATE UNIQUE INDEX "timesheet_workerId_worksiteId_date_key" ON "timesheet"("workerId", "worksiteId", "date");

-- CreateIndex
CREATE INDEX "expense_worksiteId_idx" ON "expense"("worksiteId");

-- AddForeignKey
ALTER TABLE "worksite" ADD CONSTRAINT "worksite_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "worker" ADD CONSTRAINT "worker_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timesheet" ADD CONSTRAINT "timesheet_worksiteId_fkey" FOREIGN KEY ("worksiteId") REFERENCES "worksite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timesheet" ADD CONSTRAINT "timesheet_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "worker"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense" ADD CONSTRAINT "expense_worksiteId_fkey" FOREIGN KEY ("worksiteId") REFERENCES "worksite"("id") ON DELETE CASCADE ON UPDATE CASCADE;
