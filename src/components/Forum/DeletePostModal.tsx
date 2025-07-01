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
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { ForumPost } from '@/types';

interface DeletePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  post: ForumPost;
}

export function DeletePostModal({ isOpen, onClose, onSuccess, post }: DeletePostModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      
      const response = await fetch(`/api/forum/posts/${post.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        toast.success('Post excluído com sucesso!');
        onSuccess();
        onClose();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Erro ao excluir post');
      }
    } catch (error) {
      console.error('Erro ao excluir post:', error);
      toast.error('Erro ao excluir post');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir Post</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja excluir o post "{post?.title}"?
            <br />
            <br />
            Esta ação não pode ser desfeita. O post e todas as suas respostas serão permanentemente removidos.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Excluindo...
              </>
            ) : (
              'Excluir Post'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
} 