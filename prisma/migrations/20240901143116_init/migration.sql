-- CreateTable
CREATE TABLE "PageSpeedResult" (
    "id" SERIAL NOT NULL,
    "url" TEXT NOT NULL,
    "device" TEXT NOT NULL,
    "performanceScore" DOUBLE PRECISION NOT NULL,
    "fcp" DOUBLE PRECISION NOT NULL,
    "lcp" DOUBLE PRECISION NOT NULL,
    "cls" DOUBLE PRECISION NOT NULL,
    "tti" DOUBLE PRECISION NOT NULL,
    "tbt" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PageSpeedResult_pkey" PRIMARY KEY ("id")
);
