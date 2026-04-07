"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface SessionExpiredDialogProps {
  open: boolean;
  onLogin: () => void;
}

/**
 * セッション切れを通知するダイアログ。
 * ユーザーが「ログインする」を押すまで閉じられない。
 */
export function SessionExpiredDialog({ open, onLogin }: SessionExpiredDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={() => {
        // Escape キー・バックドロップクリックによるクローズを遮断
      }}
      modal={true}
    >
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>セッションが切れました</DialogTitle>
          <DialogDescription>
            セキュリティのため、ログインセッションが終了しました。続けるには再度ログインしてください。
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={onLogin}>ログインする</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
