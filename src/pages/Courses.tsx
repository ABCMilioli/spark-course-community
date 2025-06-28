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
      const { data } = await axios.get(`${API_URL}/enrollments?user_id=${user.id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      
      return data.map((e: any) => ({ 
        id: e.course_id,
        title: e.course_title,
        description: e.course_description,
        thumbnail_url: e.course_thumbnail,
        instructor_name: e.instructor_name,
        instructor_id: e.instructor_id || '',
        price: 0,
        created_at: e.enrolled_at,
        updated_at: e.enrolled_at,
        instructor_avatar: undefined,
        enrollment_count: 0,
        rating: 0,
        category: undefined,
        level: undefined,
        instructor: {
          id: e.instructor_id || '',
          name: e.instructor_name || '',
          email: '',
          role: 'instructor' as const,
          created_at: e.enrolled_at
        },
        progress: e.progress 
      })) as EnrolledCourse[];
    },
    enabled: !!user,
  });

  const { data: availableCourses, isLoading: isLoadingAvailable } = useQuery<CourseWithInstructor[]>({
    queryKey: ['available-courses', user?.id],
    queryFn: async () => {
      const { data: courses } = await axios.get(`${API_URL}/courses`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
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

  const formatDuration = (minutes: number) => {
    if (!minutes) return 'Duração não informada';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}min`;
    }
    return `${mins}min`;
  };

  return (
    <div className="flex-1 p-6 bg-muted/40">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Cursos</h1>
          <p className="text-muted-foreground">
            Explore nossa coleção de cursos e continue aprendendo
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
        <Tabs defaultValue="available" className="space-y-6">
          <TabsList>
            <TabsTrigger value="available">Cursos Disponíveis</TabsTrigger>
            <TabsTrigger value="enrolled">Meus Cursos</TabsTrigger>
          </TabsList>

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
                            <Badge variant="secondary">{course.level}</Badge>
                          </div>
                          
                          <CardTitle className="text-lg line-clamp-2">{course.title}</CardTitle>
                          <CardDescription className="line-clamp-2">
                            {course.description}
                          </CardDescription>
                          
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {course.total_duration ? formatDuration(course.total_duration) : 'Duração não informada'}
                            </div>
                            <div className="flex items-center gap-1">
                              <BookOpen className="w-4 h-4" />
                              {course.total_lessons || 0} aulas
                            </div>
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
                <CardContent className="p-12 text-center">
                  <BookOpen className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-xl font-semibold mb-2">Nenhum curso matriculado</h3>
                  <p className="text-muted-foreground mb-4">
                    Você ainda não se matriculou em nenhum curso.
                  </p>
                  <Button onClick={() => navigate('/explore')}>
                    Explorar Cursos
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

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
                          <Badge variant="secondary">{course.level}</Badge>
                        </div>
                        
                        <CardTitle className="text-lg line-clamp-2">{course.title}</CardTitle>
                        <CardDescription className="line-clamp-2">
                          {course.description}
                        </CardDescription>
                        
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {course.total_duration ? formatDuration(course.total_duration) : 'Duração não informada'}
                          </div>
                          <div className="flex items-center gap-1">
                            <Users className="w-4 h-4" />
                            {course.enrolled_students_count || course.students_count || 0}
                          </div>
                          <div className="flex items-center gap-1">
                            <Star className="w-4 h-4 text-yellow-500" />
                            {course.rating || 0}
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <BookOpen className="w-4 h-4" />
                            {course.total_lessons || 0} aulas
                          </div>
                          <div className="font-semibold text-primary">
                            R$ {Number(course.price).toFixed(2)}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-12 text-center">
                  <BookOpen className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-xl font-semibold mb-2">Nenhum curso disponível</h3>
                  <p className="text-muted-foreground">
                    Não há cursos disponíveis no momento.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
