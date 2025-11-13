-- AlterTable
ALTER TABLE "Conversation" ADD COLUMN     "isPinned" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "pinnedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Conversation_userId_isPinned_pinnedAt_idx" ON "Conversation"("userId", "isPinned", "pinnedAt" DESC);
