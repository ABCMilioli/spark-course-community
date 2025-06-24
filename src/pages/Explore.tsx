import axios from 'axios';
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { CourseCard } from "@/components/Courses/CourseCard";
import { PostCard } from "@/components/Community/PostCard";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useQuery } from "@tanstack/react-query";
import { Profile, CourseWithInstructor, PostWithAuthor } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";

const API_URL = process.env.REACT_APP_API_URL || '/api';

export default function Explore() {

  const { data: courses, isLoading: isLoadingCourses } = useQuery({
    queryKey: ['explore-courses'],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const { data } = await axios.get(`${API_URL}/courses?limit=4`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return data;
    },
  });

  const { data: posts, isLoading: isLoadingPosts } = useQuery({
    queryKey: ['explore-posts'],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const { data } = await axios.get(`${API_URL}/posts?sort=likes_count&limit=3`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return data;
    },
  });

  const { data: instructors, isLoading: isLoadingInstructors } = useQuery({
    queryKey: ['explore-instructors'],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const { data } = await axios.get(`${API_URL}/users?role=instructor&limit=5`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return data;
    },
  });

  return (
    <div className="flex-1 p-6 space-y-8 bg-muted/40">
      {/* Search and Welcome */}
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">Explorar</h1>
        <p className="text-muted-foreground">Descubra novos cursos, posts e instrutores na EduCommunity.</p>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="O que você quer aprender hoje?" className="pl-10" />
        </div>
      </div>

      {/* Featured Courses */}
      <section>
        <h2 className="text-2xl font-semibold mb-4">Cursos em Destaque</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {isLoadingCourses && Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-72 w-full" />)}
          {courses?.map((course) => (
            <CourseCard key={course.id} course={course} />
          ))}
        </div>
      </section>

      {/* Popular Posts */}
      <section>
        <h2 className="text-2xl font-semibold mb-4">Posts Populares</h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {isLoadingPosts && Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-64 w-full" />)}
          {posts?.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      </section>

      {/* Top Instructors */}
      <section>
        <h2 className="text-2xl font-semibold mb-4">Principais Instrutores</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
          {isLoadingInstructors && Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-2">
              <Skeleton className="w-24 h-24 rounded-full" />
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
          {instructors?.map((instructor) => (
            <div key={instructor.id} className="flex flex-col items-center text-center gap-2">
              <Avatar className="w-24 h-24">
                <AvatarImage src={instructor.avatar_url ?? undefined} />
                <AvatarFallback>{instructor.name[0]}</AvatarFallback>
              </Avatar>
              <p className="font-medium text-sm">{instructor.name}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
