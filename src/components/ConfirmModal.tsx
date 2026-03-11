export default function ConfirmModal({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = "Delete",
  cancelText = "Cancel"
}: {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-surface border border-surface-border w-full max-w-sm">
        <div className="px-6 py-4 border-b border-surface-border flex items-center justify-between">
          <h2 className="text-foreground font-medium">{title}</h2>
          <button onClick={onCancel} className="text-muted hover:text-foreground text-xl">
            ×
          </button>
        </div>
        <div className="p-6">
          <p className="text-muted text-sm">{message}</p>
        </div>
        <div className="px-6 py-4 border-t border-surface-border flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-5 py-2 text-sm text-muted border border-surface-border hover:text-foreground hover:border-foreground/30 transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={() => {
              onConfirm();
              onCancel();
            }}
            className="px-5 py-2 text-sm bg-red-500/10 text-red-500 border border-red-500/30 hover:bg-red-500 hover:text-white transition-colors tracking-wider uppercase"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
