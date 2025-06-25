import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Search, Filter, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CourseCard } from "@/components/Courses/CourseCard";
import { PostCard } from "@/components/Community/PostCard";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useQuery } from "@tanstack/react-query";
import { Profile, CourseWithInstructor, PostWithAuthor } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

const API_URL = process.env.REACT_APP_API_URL || '/api';

export default function Explore() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedLevel, setSelectedLevel] = useState('all');
  const [selectedPrice, setSelectedPrice] = useState('all');

  // Função para lidar com clique no curso
  const handleCourseClick = async (courseId: string) => {
    try {
      // Verificar se o usuário está matriculado no curso
      const token = localStorage.getItem('token');
      const { data: enrollment } = await axios.get(`${API_URL}/enrollments?course_id=${courseId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Filtrar matrículas do usuário atual
      const userEnrollment = enrollment?.find((e: any) => e.user_id === user?.id);

      if (userEnrollment) {
        // Se está matriculado, navegar para o player
        navigate(`/player?courseId=${courseId}`);
      } else {
        // Se não está matriculado, navegar para detalhes do curso
        navigate(`/course/${courseId}`);
      }
    } catch (error) {
      console.error('Erro ao verificar matrícula:', error);
      // Em caso de erro, navegar para detalhes do curso
      navigate(`/course/${courseId}`);
    }
  };

  // Query de busca
  const { data: searchResults, isLoading: isLoadingSearch } = useQuery({
    queryKey: ['explore-search', searchQuery, selectedType, selectedCategory, selectedLevel, selectedPrice],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      
      if (searchQuery) params.append('q', searchQuery);
      if (selectedType !== 'all') params.append('type', selectedType);
      if (selectedCategory !== 'all') params.append('category', selectedCategory);
      if (selectedLevel !== 'all') params.append('level', selectedLevel);
      if (selectedPrice !== 'all') params.append('price', selectedPrice);
      
      const { data } = await axios.get(`${API_URL}/explore/search?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return data;
    },
    enabled: Boolean(searchQuery.length > 0 || selectedType !== 'all' || selectedCategory !== 'all' || selectedLevel !== 'all' || selectedPrice !== 'all'),
  });

  // Query para categorias populares
  const { data: categories } = useQuery({
    queryKey: ['explore-categories'],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const { data } = await axios.get(`${API_URL}/explore/categories`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return data;
    },
  });

  // Queries para conteúdo padrão (quando não há busca)
  const { data: courses, isLoading: isLoadingCourses } = useQuery({
    queryKey: ['explore-courses'],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const { data } = await axios.get(`${API_URL}/courses?limit=4`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return data;
    },
    enabled: Boolean(!searchQuery && selectedType === 'all' && selectedCategory === 'all' && selectedLevel === 'all' && selectedPrice === 'all'),
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
    enabled: Boolean(!searchQuery && selectedType === 'all' && selectedCategory === 'all' && selectedLevel === 'all' && selectedPrice === 'all'),
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
    enabled: Boolean(!searchQuery && selectedType === 'all' && selectedCategory === 'all' && selectedLevel === 'all' && selectedPrice === 'all'),
  });

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedType('all');
    setSelectedCategory('all');
    setSelectedLevel('all');
    setSelectedPrice('all');
  };

  const hasActiveFilters = searchQuery || selectedType !== 'all' || selectedCategory !== 'all' || selectedLevel !== 'all' || selectedPrice !== 'all';

  return (
    <div className="flex-1 p-6 space-y-8 bg-muted/40">
      {/* Search and Welcome */}
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">Explorar</h1>
        <p className="text-muted-foreground">Descubra novos cursos, posts e instrutores na EduCommunity.</p>
        
        {/* Barra de busca */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input 
            placeholder="O que você quer aprender hoje?" 
            className="pl-10" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">Filtros:</span>
          </div>
          
          <Select value={selectedType} onValueChange={setSelectedType}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="courses">Cursos</SelectItem>
              <SelectItem value="posts">Posts</SelectItem>
              <SelectItem value="instructors">Instrutores</SelectItem>
            </SelectContent>
          </Select>

          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {categories?.courseCategories?.slice(0, 8).map((cat: any) => (
                <SelectItem key={cat.category} value={cat.category}>
                  {cat.category} ({cat.count})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedLevel} onValueChange={setSelectedLevel}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Nível" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="Iniciante">Iniciante</SelectItem>
              <SelectItem value="Intermediário">Intermediário</SelectItem>
              <SelectItem value="Avançado">Avançado</SelectItem>
            </SelectContent>
          </Select>

          <Select value={selectedPrice} onValueChange={setSelectedPrice}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Preço" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="free">Gratuito</SelectItem>
              <SelectItem value="paid">Pago</SelectItem>
            </SelectContent>
          </Select>

          {hasActiveFilters && (
            <Button variant="outline" size="sm" onClick={clearFilters}>
              <X className="w-4 h-4 mr-1" />
              Limpar
            </Button>
          )}
        </div>
      </div>

      {/* Resultados da busca */}
      {hasActiveFilters && (
        <div className="space-y-6">
          {isLoadingSearch ? (
            <div className="space-y-4">
              <Skeleton className="h-8 w-48" />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-72 w-full" />)}
              </div>
            </div>
          ) : (
            <>
              {/* Cursos encontrados */}
              {searchResults?.courses && searchResults.courses.length > 0 && (
                <section>
                  <h2 className="text-2xl font-semibold mb-4">Cursos Encontrados ({searchResults.courses.length})</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {searchResults.courses.map((course: CourseWithInstructor) => (
                      <CourseCard key={course.id} course={course} onPlay={() => handleCourseClick(course.id.toString())} />
                    ))}
                  </div>
                </section>
              )}

              {/* Posts encontrados */}
              {searchResults?.posts && searchResults.posts.length > 0 && (
                <section>
                  <h2 className="text-2xl font-semibold mb-4">Posts Encontrados ({searchResults.posts.length})</h2>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {searchResults.posts.map((post: PostWithAuthor) => (
                      <PostCard key={post.id} post={post} />
                    ))}
                  </div>
                </section>
              )}

              {/* Instrutores encontrados */}
              {searchResults?.instructors && searchResults.instructors.length > 0 && (
                <section>
                  <h2 className="text-2xl font-semibold mb-4">Instrutores Encontrados ({searchResults.instructors.length})</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                    {searchResults.instructors.map((instructor: Profile) => (
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
              )}

              {/* Nenhum resultado */}
              {(!searchResults?.courses || searchResults.courses.length === 0) &&
               (!searchResults?.posts || searchResults.posts.length === 0) &&
               (!searchResults?.instructors || searchResults.instructors.length === 0) && (
                <div className="text-center py-12">
                  <p className="text-muted-foreground text-lg">Nenhum resultado encontrado para sua busca.</p>
                  <Button variant="outline" onClick={clearFilters} className="mt-4">
                    Limpar filtros
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Conteúdo padrão (quando não há busca) */}
      {!hasActiveFilters && (
        <>
          {/* Categorias Populares */}
          {categories && (
            <section>
              <h2 className="text-2xl font-semibold mb-4">Categorias Populares</h2>
              <div className="flex flex-wrap gap-2">
                {categories.courseCategories?.slice(0, 8).map((cat: any) => (
                  <Badge 
                    key={cat.category} 
                    variant="secondary" 
                    className="cursor-pointer hover:bg-primary hover:text-primary-foreground"
                    onClick={() => setSelectedCategory(cat.category)}
                  >
                    {cat.category} ({cat.count})
                  </Badge>
                ))}
              </div>
            </section>
          )}

          {/* Featured Courses */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">Cursos em Destaque</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {isLoadingCourses && Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-72 w-full" />)}
              {courses?.map((course) => (
                <CourseCard key={course.id} course={course} onPlay={() => handleCourseClick(course.id.toString())} />
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
        </>
      )}
    </div>
  );
}
