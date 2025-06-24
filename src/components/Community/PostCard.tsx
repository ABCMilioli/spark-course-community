
import { MessageSquare, Heart, Share2, Bookmark, MoreHorizontal } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PostWithAuthor } from "@/types";

interface PostCardProps {
  post: PostWithAuthor & { isLiked?: boolean }; // isLiked is not in DB yet
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
    onLike?.(post.id);
  };

  const handleCardClick = () => {
    onClick?.(post.id);
  };
  
  const author = post.profiles;

  if (!author) return null;

  return (
    <Card 
      className="hover:shadow-lg transition-all duration-300 cursor-pointer group animate-fade-in"
      onClick={handleCardClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="w-10 h-10">
              <AvatarImage src={author.avatar_url ?? undefined} />
              <AvatarFallback>{author.name[0]}</AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-medium text-sm">{author.name}</p>
                <Badge 
                  variant={author.role === 'instructor' ? 'default' : 'secondary'}
                  className="text-xs"
                >
                  {author.role === 'instructor' ? 'Instrutor' : 
                   author.role === 'admin' ? 'Admin' : 
                   author.role === 'premium' ? 'Premium' : 'Membro'}
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

        {/* Tags */}
        <div className="flex flex-wrap gap-1">
          {post.tags?.map((tag) => (
            <Badge key={tag} variant="outline" className="text-xs">
              #{tag}
            </Badge>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-border/50">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleLike}
              className={`gap-2 text-muted-foreground`} // Removed like state color
            >
              <Heart className={`w-4 h-4`} />
              <span className="text-sm">{post.likes_count}</span>
            </Button>
            
            <Button variant="ghost" size="sm" className="gap-2">
              <MessageSquare className="w-4 h-4" />
              <span className="text-sm">{post.comments_count}</span>
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
