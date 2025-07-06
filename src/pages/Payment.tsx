import { useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchCourseDetail } from '@/lib/utils';
import { parsePrice, formatPrice } from '@/lib/price';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Check } from 'lucide-react';
import TransparentCheckout from '@/components/Payment/TransparentCheckout';

export default function Payment() {
  const navigate = useNavigate();
  const { courseId } = useParams<{ courseId: string }>();
  const [searchParams] = useSearchParams();
  const courseIdFromParams = searchParams.get('courseId') || courseId;

  console.log('Payment.tsx - courseId (params):', courseId);
  console.log('Payment.tsx - courseId (searchParams):', searchParams.get('courseId'));
  console.log('Payment.tsx - courseIdFromParams:', courseIdFromParams);

  const { data: course, isLoading } = useQuery({
    queryKey: ['course-payment', courseIdFromParams],
    queryFn: () => {
      console.log('Payment.tsx - Chamando fetchCourseDetail para:', courseIdFromParams);
      return fetchCourseDetail(courseIdFromParams!);
    },
    enabled: !!courseIdFromParams,
  });

  const handleBack = () => {
    navigate(`/course/${courseIdFromParams}`);
  };

  if (isLoading) {
    return (
      <div className="flex-1 p-6 bg-muted/40">
        <div className="max-w-2xl mx-auto space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="flex-1 p-6 bg-muted/40">
        <div className="max-w-2xl mx-auto text-center">
          <p>Curso não encontrado.</p>
          <Button onClick={() => navigate('/explore')} className="mt-4">
            Voltar para Explorar
          </Button>
        </div>
      </div>
    );
  }

  const coursePrice = parsePrice(course.price);

  return (
    <div className="flex-1 p-6 bg-muted/40">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="grid md:grid-cols-2 gap-6">
          {/* Checkout */}
          <TransparentCheckout
            courseId={course.id}
            courseTitle={course.title}
            coursePrice={coursePrice}
          />

          {/* Informações */}
          <div className="space-y-6">
            {/* Detalhes do Curso */}
            <Card>
              <CardHeader>
                <CardTitle>Detalhes do Curso</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <img
                      src={course.thumbnail_url || '/placeholder.svg'}
                      alt={course.title}
                      className="w-24 h-24 object-cover rounded-lg"
                    />
                    <div>
                      <h3 className="font-medium">{course.title}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {course.description}
                      </p>
                    </div>
                  </div>
                  <div className="pt-4 border-t">
                    <p className="text-2xl font-bold">
                      {formatPrice(coursePrice)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Benefícios */}
            <Card>
              <CardHeader>
                <CardTitle>O que você recebe</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-green-500" />
                    <span>Acesso vitalício ao curso</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-green-500" />
                    <span>Certificado de conclusão</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-green-500" />
                    <span>Suporte da comunidade</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-green-500" />
                    <span>Atualizações gratuitas</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-green-500" />
                    <span>Garantia de 30 dias</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Voltar */}
            <Button
              variant="outline"
              className="w-full"
              onClick={handleBack}
            >
              Voltar para o Curso
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
} 