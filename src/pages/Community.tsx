import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
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
  const [isCreateModalOpen, setCreateModalOpen] = useState(false);

  const { data: posts, isLoading, error } = useQuery({
    queryKey: ['posts'],
    queryFn: fetchPosts,
  });

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

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {posts?.map((post) => (
          <PostCard key={post.id} post={post} onClick={handlePostClick} />
        ))}
      </div>

      <CreatePostModal
        open={isCreateModalOpen}
        onOpenChange={setCreateModalOpen}
      />
    </div>
  );
}
