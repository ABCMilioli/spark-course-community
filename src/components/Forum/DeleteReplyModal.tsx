import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Trash2 } from 'lucide-react';
import { ForumReply } from '@/types';

interface DeleteReplyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  reply: ForumReply | null;
  isDeleting?: boolean;
}

export function DeleteReplyModal({ isOpen, onClose, onConfirm, reply, isDeleting = false }: DeleteReplyModalProps) {
  if (!reply) return null;

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-destructive" />
            Confirmar Exclusão
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>Tem certeza que deseja deletar esta resposta?</p>
            <div className="p-3 bg-muted rounded-lg border-l-4 border-muted-foreground">
              <p className="text-sm font-medium mb-1">Resposta de {reply.author_name}:</p>
              <p className="text-sm text-muted-foreground line-clamp-3">
                {reply.content}
              </p>
            </div>
            <p className="text-sm text-destructive">
              ⚠️ Esta ação não pode ser desfeita. A resposta e todas as suas curtidas serão removidas permanentemente.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? 'Deletando...' : 'Sim, Deletar'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
} 