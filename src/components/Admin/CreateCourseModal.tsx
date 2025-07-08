import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast as sonnerToast } from 'sonner';
import { Image, Video, X, Upload, Loader2 } from 'lucide-react';
import axios from 'axios';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useQuery } from "@tanstack/react-query";

const courseSchema = z.object({
  title: z.string().min(5, { message: 'O título deve ter pelo menos 5 caracteres.' }),
  description: z.string().min(10, { message: 'A descrição deve ter pelo menos 10 caracteres.' }),
  category: z.string().min(3, { message: 'A categoria deve ter pelo menos 3 caracteres.' }),
  level: z.string().min(3, { message: 'O nível é obrigatório.' }),
  isPaid: z.boolean(),
  price: z.string(),
  thumbnail: z.string().optional(),
  demo_video: z.string().optional(),
  payment_gateway: z.enum(['mercadopago', 'stripe', 'hotmart', 'kiwify']).optional(),
  external_checkout_url: z.string().url().optional().or(z.literal('')),
});

type CourseFormValues = z.infer<typeof courseSchema>;

interface CreateCourseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  initialData?: Partial<CourseFormValues> & { id?: string };
  isEdit?: boolean;
}

export function CreateCourseModal({ open, onOpenChange, onSuccess, initialData, isEdit }: CreateCourseModalProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string>('');
  const [videoPreview, setVideoPreview] = useState<string>('');

  const form = useForm<CourseFormValues>({
    resolver: zodResolver(courseSchema),
    defaultValues: {
      title: '',
      description: '',
      category: '',
      level: '',
      isPaid: false,
      price: '0',
      thumbnail: '',
      demo_video: '',
      payment_gateway: 'mercadopago',
      external_checkout_url: ''
    },
  });

  const isPaid = form.watch('isPaid');
  const selectedGateway = form.watch('payment_gateway');

  const API_URL = process.env.REACT_APP_API_URL || '/api';

  // Buscar categorias dinamicamente
  const { data: categories, isLoading: isLoadingCategories } = useQuery({
    queryKey: ['explore-categories'],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const { data } = await axios.get(`${API_URL}/explore/categories`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return data;
    },
  });

  useEffect(() => {
    if (open && initialData) {
      const price = initialData.price || '0';
      const isPaid = parseFloat(price) > 0;
      form.reset({
        title: initialData.title || '',
        description: initialData.description || '',
        category: initialData.category || '',
        level: initialData.level || '',
        isPaid: isPaid,
        price: price,
        thumbnail: initialData.thumbnail || '',
        demo_video: initialData.demo_video || '',
        payment_gateway: initialData.payment_gateway || 'mercadopago',
        external_checkout_url: initialData.external_checkout_url || ''
      });
      setThumbnailPreview(initialData.thumbnail || '');
      setVideoPreview(initialData.demo_video || '');
    } else if (open && !initialData) {
      form.reset({ 
        title: '', 
        description: '', 
        category: '', 
        level: '', 
        isPaid: false, 
        price: '0', 
        thumbnail: '',
        demo_video: '',
        payment_gateway: 'mercadopago',
        external_checkout_url: ''
      });
      setThumbnailPreview('');
      setVideoPreview('');
      setThumbnailFile(null);
      setVideoFile(null);
    }
    // eslint-disable-next-line
  }, [open, initialData]);

  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        sonnerToast.error('Por favor, selecione apenas arquivos de imagem.');
        return;
      }
      
      if (file.size > 5 * 1024 * 1024) {
        sonnerToast.error('A imagem deve ter no máximo 5MB.');
        return;
      }
      
      setThumbnailFile(file);
      
      const reader = new FileReader();
      reader.onload = (e) => {
        setThumbnailPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('video/')) {
        sonnerToast.error('Por favor, selecione apenas arquivos de vídeo.');
        return;
      }
      
      if (file.size > 100 * 1024 * 1024) { // 100MB
        sonnerToast.error('O vídeo deve ter no máximo 100MB.');
        return;
      }
      
      setVideoFile(file);
      
      const reader = new FileReader();
      reader.onload = (e) => {
        setVideoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadThumbnail = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    
    const token = localStorage.getItem('token');
    const response = await axios.post(`${API_URL}/upload/thumbnail`, formData, {
      headers: { 
        Authorization: `Bearer ${token}`,
        'Content-Type': 'multipart/form-data'
      }
    });
    
    return response.data.url;
  };

  const uploadVideo = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    
    const token = localStorage.getItem('token');
    const response = await axios.post(`${API_URL}/upload/video`, formData, {
      headers: { 
        Authorization: `Bearer ${token}`,
        'Content-Type': 'multipart/form-data'
      }
    });
    
    return response.data.url;
  };

  const onSubmit = async (data: CourseFormValues) => {
    try {
      setIsUploading(true);
      
      // Validação do preço
      if (data.isPaid) {
        const price = parseFloat(data.price);
        if (isNaN(price) || price <= 0) {
          sonnerToast.error('Para cursos pagos, o preço deve ser maior que zero.');
          return;
        }
      }

      // Validação do gateway externo
      if ((data.payment_gateway === 'hotmart' || data.payment_gateway === 'kiwify') && !data.external_checkout_url) {
        sonnerToast.error('Para gateways externos, a URL do checkout é obrigatória.');
        return;
      }

      // Upload de thumbnail se selecionado
      if (thumbnailFile) {
        try {
          const thumbnailUrl = await uploadThumbnail(thumbnailFile);
          data.thumbnail = thumbnailUrl;
          sonnerToast.success('Thumbnail enviada com sucesso!');
        } catch (error) {
          sonnerToast.error('Erro ao enviar thumbnail');
          return;
        }
      }

      // Upload de vídeo se selecionado
      if (videoFile) {
        try {
          const videoUrl = await uploadVideo(videoFile);
          data.demo_video = videoUrl;
          sonnerToast.success('Vídeo enviado com sucesso!');
        } catch (error) {
          sonnerToast.error('Erro ao enviar vídeo');
          return;
        }
      }

      // Se não é pago, definir preço como 0
      const finalPrice = data.isPaid ? parseFloat(data.price) : 0;

      const courseData = {
        ...data,
        price: finalPrice,
        payment_gateway: data.payment_gateway || 'mercadopago',
        external_checkout_url: data.external_checkout_url || null
      };

      const token = localStorage.getItem('token');
      if (isEdit && initialData?.id) {
        await axios.put(`${API_URL}/courses/${initialData.id}`, courseData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        sonnerToast.success('Curso editado com sucesso!');
      } else {
        await axios.post(`${API_URL}/courses`, courseData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        sonnerToast.success('Curso criado com sucesso!');
      }
      
      onOpenChange(false);
      form.reset();
      setThumbnailPreview('');
      setVideoPreview('');
      setThumbnailFile(null);
      setVideoFile(null);
      onSuccess?.();
    } catch (err) {
      sonnerToast.error('Erro ao salvar curso', {
        description: 'Verifique os dados e tente novamente.',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleThumbnailUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    form.setValue('thumbnail', value);
    setThumbnailPreview(value);
    setThumbnailFile(null);
  };

  const handleVideoUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    form.setValue('demo_video', value);
    setVideoPreview(value);
    setVideoFile(null);
  };

  const clearThumbnail = () => {
    form.setValue('thumbnail', '');
    setThumbnailPreview('');
    setThumbnailFile(null);
  };

  const clearVideo = () => {
    form.setValue('demo_video', '');
    setVideoPreview('');
    setVideoFile(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar Curso' : 'Criar Novo Curso'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Altere os dados do curso abaixo.' : 'Preencha os dados abaixo para adicionar um novo curso à plataforma.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Título do Curso</Label>
              <Input
                id="title"
                placeholder="Digite o título do curso"
                {...form.register("title")}
              />
              {form.formState.errors.title && (
                <p className="text-sm text-destructive">{form.formState.errors.title.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Categoria</Label>
              <Input
                id="category"
                placeholder="Digite a categoria do curso"
                {...form.register("category")}
              />
              {form.formState.errors.category && (
                <p className="text-sm text-destructive">{form.formState.errors.category.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              placeholder="Digite a descrição do curso"
              className="min-h-[80px]"
              {...form.register("description")}
            />
            {form.formState.errors.description && (
              <p className="text-sm text-destructive">{form.formState.errors.description.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="level">Nível</Label>
              <Select 
                value={form.watch("level")} 
                onValueChange={(value) => form.setValue("level", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o nível" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Iniciante">Iniciante</SelectItem>
                  <SelectItem value="Intermediário">Intermediário</SelectItem>
                  <SelectItem value="Avançado">Avançado</SelectItem>
                </SelectContent>
              </Select>
              {form.formState.errors.level && (
                <p className="text-sm text-destructive">{form.formState.errors.level.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="price">Preço (R$)</Label>
              <div className="relative">
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder={isPaid ? "0.00" : "Gratuito"}
                  disabled={!isPaid}
                  className={!isPaid ? "bg-muted text-muted-foreground" : ""}
                  {...form.register("price")}
                  onBlur={(e) => {
                    if (isPaid && e.target.value) {
                      const price = parseFloat(e.target.value);
                      if (isNaN(price) || price <= 0) {
                        form.setError("price", {
                          type: "manual",
                          message: "Para cursos pagos, o preço deve ser maior que zero."
                        });
                      } else {
                        form.clearErrors("price");
                      }
                    }
                  }}
                />
                {!isPaid && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <span className="text-sm text-muted-foreground">Gratuito</span>
                  </div>
                )}
              </div>
              {form.formState.errors.price && (
                <p className="text-sm text-destructive">{form.formState.errors.price.message}</p>
              )}
              {isPaid && (
                <p className="text-xs text-muted-foreground">
                  Digite o valor em reais (ex: 99.90)
                </p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Switch
                  id="isPaid"
                  checked={isPaid}
                  onCheckedChange={(checked) => {
                    form.setValue("isPaid", checked);
                    if (!checked) {
                      form.setValue("price", "0");
                    }
                  }}
                />
                <Label htmlFor="isPaid">Curso Pago</Label>
              </div>
              <p className="text-xs text-muted-foreground">
                {isPaid ? "Ative para definir um preço" : "Desative para curso gratuito"}
              </p>
            </div>
          </div>

          {/* Configuração de Gateway de Pagamento - Apenas para cursos pagos */}
          {isPaid && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="payment_gateway">Gateway de Pagamento</Label>
                <Select 
                  value={selectedGateway} 
                  onValueChange={(value) => {
                    form.setValue("payment_gateway", value as any);
                    // Limpar URL externa se mudar para gateway interno
                    if (value !== 'hotmart' && value !== 'kiwify') {
                      form.setValue("external_checkout_url", '');
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o gateway" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mercadopago">
                      <div className="flex items-center gap-2">
                        <span>🛒</span>
                        <span>Mercado Pago</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="stripe">
                      <div className="flex items-center gap-2">
                        <span>💳</span>
                        <span>Stripe</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="hotmart">
                      <div className="flex items-center gap-2">
                        <span>🔥</span>
                        <span>Hotmart</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="kiwify">
                      <div className="flex items-center gap-2">
                        <span>🥝</span>
                        <span>Kiwify</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                {form.formState.errors.payment_gateway && (
                  <p className="text-sm text-destructive">{form.formState.errors.payment_gateway.message}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  {selectedGateway === 'mercadopago' && 'PIX, Boleto, Cartão de Crédito'}
                  {selectedGateway === 'stripe' && 'Cartão de Crédito, PIX, Boleto'}
                  {selectedGateway === 'hotmart' && 'Checkout externo - Hotmart'}
                  {selectedGateway === 'kiwify' && 'Checkout externo - Kiwify'}
                </p>
              </div>

              {/* URL de Checkout Externo - Apenas para gateways externos */}
              {(selectedGateway === 'hotmart' || selectedGateway === 'kiwify') && (
                <div className="space-y-2">
                  <Label htmlFor="external_checkout_url">
                    URL do Checkout {selectedGateway === 'hotmart' ? 'Hotmart' : 'Kiwify'}
                  </Label>
                  <Input
                    id="external_checkout_url"
                    placeholder={
                      selectedGateway === 'hotmart' 
                        ? "https://pay.hotmart.com/SEU_PRODUTO" 
                        : "https://kiwify.com.br/SEU_PRODUTO"
                    }
                    {...form.register("external_checkout_url")}
                  />
                  {form.formState.errors.external_checkout_url && (
                    <p className="text-sm text-destructive">{form.formState.errors.external_checkout_url.message}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    URL completa do checkout do seu produto no {selectedGateway === 'hotmart' ? 'Hotmart' : 'Kiwify'}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Upload de Thumbnail */}
          <div className="space-y-2">
            <Label htmlFor="thumbnail">Thumbnail do Curso</Label>
            <div className="flex items-center gap-4">
              <Input
                id="thumbnail"
                type="file"
                accept="image/*"
                onChange={handleThumbnailChange}
                className="flex-1"
              />
              {thumbnailPreview && (
                <div className="relative">
                  <img
                    src={thumbnailPreview}
                    alt="Preview"
                    className="w-16 h-16 object-cover rounded border"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="absolute -top-2 -right-2 w-6 h-6 p-0"
                    onClick={clearThumbnail}
                  >
                    ×
                  </Button>
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Formatos aceitos: JPG, PNG, GIF. Tamanho máximo: 5MB
            </p>
          </div>

          {/* Upload de Vídeo Demo */}
          <div className="space-y-2">
            <Label htmlFor="demoVideo">Vídeo Demo (Opcional)</Label>
            <div className="flex items-center gap-4">
              <Input
                id="demoVideo"
                type="file"
                accept="video/*"
                onChange={handleVideoChange}
                className="flex-1"
              />
              {videoPreview && (
                <div className="relative">
                  <video
                    src={videoPreview}
                    className="w-24 h-16 object-cover rounded border"
                    controls
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="absolute -top-2 -right-2 w-6 h-6 p-0"
                    onClick={clearVideo}
                  >
                    ×
                  </Button>
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Formatos aceitos: MP4, WebM, OGV. Tamanho máximo: 100MB
            </p>
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isUploading}>
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isEdit ? 'Salvando...' : 'Criando...'}
                </>
              ) : (
                isEdit ? 'Salvar Alterações' : 'Criar Curso'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
