import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Plus, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PostCard } from "@/components/Community/PostCard";
import { CreatePostModal } from "@/components/Admin/CreatePostModal";
import { useQuery } from "@tanstack/react-query";
import axios from 'axios';
import { PostWithAuthor } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";

const API_URL = process.env.REACT_APP_API_URL || '/api';

async function fetchPosts() {
  const token = localStorage.getItem('token');
  const { data } = await axios.get(`${API_URL}/posts`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return data;
}

export default function Community() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isCreateModalOpen, setCreateModalOpen] = useState(false);

  const { data: posts, isLoading, error } = useQuery({
    queryKey: ['posts'],
    queryFn: fetchPosts,
  });

  // Pega o termo de busca da URL
  const searchParams = new URLSearchParams(location.search);
  const searchTerm = searchParams.get('search')?.toLowerCase() || '';

  // Filtra os posts pelo termo buscado (título ou conteúdo)
  const filteredPosts = posts?.filter(post =>
    post.title.toLowerCase().includes(searchTerm) ||
    post.content?.toLowerCase().includes(searchTerm)
  );

  // Função para lidar com clique no post
  const handlePostClick = (postId: string) => {
    navigate(`/post/${postId}`);
  };

  return (
    <div className="flex-1 p-6 space-y-6 bg-muted/40">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Comunidade</h1>
          <p className="text-muted-foreground">
            Participe de discussões, compartilhe conhecimento e conecte-se com outros membros.
          </p>
        </div>
        <Button onClick={() => setCreateModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Criar Post
        </Button>
      </div>
      
      {isLoading && (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="p-4 space-y-4 border rounded-lg bg-background">
              <div className="flex items-center gap-3">
                <Skeleton className="w-10 h-10 rounded-full" />
                <div className="space-y-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
            </div>
          ))}
        </div>
      )}

      {error && <div className="text-red-500">Erro ao carregar os posts: {error.message}</div>}

      {!isLoading && !error && (
        <>
          {searchTerm && (
            <div className="mb-4 p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">
                Buscando por: <span className="font-medium text-foreground">"{searchTerm}"</span>
                {filteredPosts && (
                  <span className="ml-2">
                    ({filteredPosts.length} resultado{filteredPosts.length !== 1 ? 's' : ''})
                  </span>
                )}
              </p>
            </div>
          )}

          {filteredPosts && filteredPosts.length === 0 && searchTerm && (
            <div className="text-center py-8">
              <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhum resultado encontrado</h3>
              <p className="text-muted-foreground mb-4">
                Não encontramos posts com o termo "{searchTerm}". Tente uma busca diferente.
              </p>
              <Button variant="outline" onClick={() => navigate('/community')}>
                Limpar Busca
              </Button>
            </div>
          )}

          {filteredPosts && filteredPosts.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredPosts.map((post) => (
                <PostCard key={post.id} post={post} onClick={handlePostClick} />
              ))}
            </div>
          )}
        </>
      )}

      <CreatePostModal
        open={isCreateModalOpen}
        onOpenChange={setCreateModalOpen}
      />
    </div>
  );
}
