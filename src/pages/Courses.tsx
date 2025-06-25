import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { BookOpen, Clock, Users, Star, Search, Play } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { CourseWithInstructor, EnrolledCourse } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';

const API_URL = process.env.REACT_APP_API_URL || '/api';

async function fetchCourses() {
  const token = localStorage.getItem('token');
  const { data } = await axios.get(`${API_URL}/courses`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return data;
}

export default function Courses() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');

  const { data: enrolledCourses, isLoading: isLoadingEnrolled } = useQuery<EnrolledCourse[]>({
    queryKey: ['enrolled-courses', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await axios.get(`${API_URL}/enrollments`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (error) throw error;
      
      return data.map(e => ({ ...e.courses!, progress: e.progress })) as EnrolledCourse[];
    },
    enabled: !!user,
  });

  const { data: availableCourses, isLoading: isLoadingAvailable } = useQuery<CourseWithInstructor[]>({
    queryKey: ['available-courses', user?.id],
    queryFn: async () => {
      const { data: courses, error } = await axios.get(`${API_URL}/courses`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (error) throw error;
      if (!user) return courses as CourseWithInstructor[];

      const enrolledCourseIds = enrolledCourses?.map(c => c.id) || [];
      return (courses as CourseWithInstructor[]).filter(c => !enrolledCourseIds.includes(c.id));
    },
    enabled: !!user,
  });
  
  const handleCourseClick = (courseId: string) => {
    navigate(`/course/${courseId}`);
  };

  const handleContinueCourse = (courseId: string) => {
    // TODO: Find the next uncompleted lesson to navigate to.
    // For now, just go to the course detail page.
    navigate(`/course/${courseId}`);
  };

  const filteredEnrolledCourses = enrolledCourses?.filter(course =>
    course.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredAvailableCourses = availableCourses?.filter(course =>
    course.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Meus Cursos</h1>
        <p className="text-muted-foreground">
          Acompanhe seu progresso e continue aprendendo
        </p>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Buscar cursos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="enrolled" className="w-full">
        <TabsList>
          <TabsTrigger value="enrolled">Cursos Matriculados ({enrolledCourses?.length || 0})</TabsTrigger>
          <TabsTrigger value="available">Cursos Disponíveis ({availableCourses?.length || 0})</TabsTrigger>
        </TabsList>
        
        {/* Enrolled Courses */}
        <TabsContent value="enrolled" className="space-y-6">
          {isLoadingEnrolled ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-96 w-full" />)}
            </div>
          ) : filteredEnrolledCourses && filteredEnrolledCourses.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredEnrolledCourses.map((course) => (
                <Card key={course.id} className="cursor-pointer hover:shadow-lg transition-shadow">
                  <div onClick={() => handleContinueCourse(course.id)}>
                    <CardHeader className="p-0">
                      <img 
                        src={course.thumbnail_url || '/placeholder.svg'}
                        alt={course.title}
                        className="w-full h-48 object-cover rounded-t-lg"
                      />
                    </CardHeader>
                    <CardContent className="p-6">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          {course.tags?.slice(0, 1).map(tag => <Badge key={tag} variant="outline">{tag}</Badge>)}
                          <Badge variant="secondary">{course.level}</Badge>
                        </div>
                        
                        <CardTitle className="text-lg line-clamp-2">{course.title}</CardTitle>
                        <CardDescription className="line-clamp-2">
                          {course.description}
                        </CardDescription>
                        
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {course.duration}
                          </div>
                          {/* <div className="flex items-center gap-1">
                            <BookOpen className="w-4 h-4" />
                            TODO: Add lesson count
                          </div> */}
                        </div>

                        <div className="space-y-2">
                          <div className="flex justify-between items-center text-sm">
                            <span>Progresso</span>
                            <span>{course.progress || 0}%</span>
                          </div>
                          <Progress value={course.progress || 0} />
                        </div>
                      </div>
                    </CardContent>
                  </div>
                  
                  <div className="px-6 pb-6">
                    <Button 
                      className="w-full" 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleContinueCourse(course.id);
                      }}
                    >
                      <Play className="w-4 h-4 mr-2" />
                      Continuar Curso
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Nenhum curso encontrado</h3>
                <p className="text-muted-foreground">
                  {searchTerm ? 'Nenhum curso matriculado corresponde à sua busca.' : 'Você ainda não se matriculou em nenhum curso.'}
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Available Courses */}
        <TabsContent value="available" className="space-y-6">
          {isLoadingAvailable ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-96 w-full" />)}
            </div>
          ) : filteredAvailableCourses && filteredAvailableCourses.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAvailableCourses.map((course) => (
                <Card key={course.id} className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => handleCourseClick(course.id)}>
                  <CardHeader className="p-0">
                    <img 
                      src={course.thumbnail_url || '/placeholder.svg'}
                      alt={course.title}
                      className="w-full h-48 object-cover rounded-t-lg"
                    />
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                         {course.tags?.slice(0, 1).map(tag => <Badge key={tag} variant="outline">{tag}</Badge>)}
                        <Badge variant="secondary">{course.level}</Badge>
                      </div>
                      
                      <CardTitle className="text-lg line-clamp-2">{course.title}</CardTitle>
                      <CardDescription className="line-clamp-2">
                        {course.description}
                      </CardDescription>
                      
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {course.duration}
                        </div>
                        <div className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          {course.students_count}
                        </div>
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 text-yellow-500" />
                          {course.rating}
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-lg font-bold text-primary">R$ {Number(course.price).toFixed(2)}</span>
                        <Button size="sm">
                          Ver Curso
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Nenhum curso encontrado</h3>
                <p className="text-muted-foreground">
                  {searchTerm ? 'Nenhum curso disponível corresponde à sua busca.' : 'Não há cursos disponíveis no momento.'}
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
