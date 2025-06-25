import { MessageSquare, Heart, Share2, Bookmark, MoreHorizontal } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Post } from "@/types";

interface PostCardProps {
  post: Post & { isLiked?: boolean };
  onLike?: (postId: string) => void;
  onClick?: (postId: string) => void;
}

export function PostCard({ post, onLike, onClick }: PostCardProps) {
  const timeAgo = formatDistanceToNow(new Date(post.created_at), {
    addSuffix: true,
    locale: ptBR
  });

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    onLike?.(post.id.toString());
  };

  const handleCardClick = () => {
    onClick?.(post.id.toString());
  };

  return (
    <Card 
      className="hover:shadow-lg transition-all duration-300 cursor-pointer group animate-fade-in"
      onClick={handleCardClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="w-10 h-10">
              <AvatarImage src={post.author_avatar ?? undefined} />
              <AvatarFallback>{post.author_name?.[0] || 'U'}</AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-medium text-sm">{post.author_name}</p>
                <Badge variant="secondary" className="text-xs">
                  Membro
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">{timeAgo}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm">
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div>
          <h3 className="font-semibold text-lg mb-2 group-hover:text-primary transition-colors">
            {post.title}
          </h3>
          <p className="text-muted-foreground text-sm leading-relaxed">
            {post.content}
          </p>
        </div>

        {post.category && (
          <div className="flex flex-wrap gap-1">
            <Badge variant="outline" className="text-xs">
              #{post.category}
            </Badge>
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-border/50">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleLike}
              className="gap-2 text-muted-foreground"
            >
              <Heart className="w-4 h-4" />
              <span className="text-sm">{post.likes_count || 0}</span>
            </Button>
            
            <Button variant="ghost" size="sm" className="gap-2">
              <MessageSquare className="w-4 h-4" />
              <span className="text-sm">{post.comments_count || 0}</span>
            </Button>

            <Button variant="ghost" size="sm" className="gap-2">
              <Bookmark className="w-4 h-4" />
              <span className="text-sm">{post.favorites_count || 0}</span>
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm">
              <Share2 className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <Bookmark className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
