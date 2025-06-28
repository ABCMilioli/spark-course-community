import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Upload, TestTube, FileImage, Video, FileText, User, Play, Settings } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CustomVideoPlayer } from '@/components/VideoPlayer/CustomVideoPlayer';

const API_URL = process.env.REACT_APP_API_URL || '/api';

export function MinioTest() {
  const [isTesting, setIsTesting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<{ [key: string]: string }>({});
  const [vimeoUrl, setVimeoUrl] = useState('https://vimeo.com/123456789');
  const [testFields, setTestFields] = useState({
    youtube_id: '',
    video_url: '',
    video_file: ''
  });

  const testMinioConnection = async () => {
    setIsTesting(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/minio/test`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setTestResult(response.data);
      toast.success('Teste de conectividade realizado com sucesso!');
    } catch (error: any) {
      console.error('Erro no teste:', error);
      setTestResult({ 
        success: false, 
        error: error.response?.data?.error || 'Erro desconhecido',
        details: error.response?.data?.details || error.message
      });
      toast.error('Erro no teste de conectividade');
    } finally {
      setIsTesting(false);
    }
  };

  const uploadFile = async (type: 'thumbnail' | 'video' | 'material' | 'avatar') => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = type === 'video' ? 'video/*' : 'image/*';
    
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      setIsUploading(true);
      
      try {
        const formData = new FormData();
        formData.append('file', file);
        
        const token = localStorage.getItem('token');
        const endpoint = type === 'video' ? 'video' : type;
        
        const response = await axios.post(`${API_URL}/upload/${endpoint}`, formData, {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        });
        
        setUploadedFiles(prev => ({
          ...prev,
          [type]: response.data.url
        }));
        
        toast.success(`${type} enviado com sucesso!`);
        console.log(`${type} URL:`, response.data.url);
      } catch (error) {
        console.error(`Erro ao enviar ${type}:`, error);
        toast.error(`Erro ao enviar ${type}`);
      } finally {
        setIsUploading(false);
      }
    };
    
    input.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      toast.success(`Arquivo selecionado: ${file.name}`);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Teste de Integrações</h2>
        <p className="text-muted-foreground">Teste as integrações do sistema</p>
      </div>

      <Tabs defaultValue="minio" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="minio">MinIO Upload</TabsTrigger>
          <TabsTrigger value="vimeo">Vimeo Player</TabsTrigger>
          <TabsTrigger value="fields">Campos Teste</TabsTrigger>
          <TabsTrigger value="status">Status</TabsTrigger>
        </TabsList>

        <TabsContent value="minio" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TestTube className="w-5 h-5" />
                Teste de Upload MinIO
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Button 
                  onClick={() => uploadFile('thumbnail')}
                  disabled={uploading}
                  className="flex items-center gap-2"
                >
                  <FileImage className="w-4 h-4" />
                  {uploading ? 'Enviando...' : 'Upload Thumbnail'}
                </Button>
                
                <Button 
                  onClick={() => uploadFile('video')}
                  disabled={uploading}
                  className="flex items-center gap-2"
                >
                  <Video className="w-4 h-4" />
                  {uploading ? 'Enviando...' : 'Upload Vídeo'}
                </Button>
                
                <Button 
                  onClick={() => uploadFile('material')}
                  disabled={uploading}
                  className="flex items-center gap-2"
                >
                  <FileText className="w-4 h-4" />
                  {uploading ? 'Enviando...' : 'Upload Material'}
                </Button>
                
                <Button 
                  onClick={() => uploadFile('avatar')}
                  disabled={uploading}
                  className="flex items-center gap-2"
                >
                  <User className="w-4 h-4" />
                  {uploading ? 'Enviando...' : 'Upload Avatar'}
                </Button>
              </div>

              {Object.keys(uploadedFiles).length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium">Arquivos Enviados:</h4>
                  {Object.entries(uploadedFiles).map(([type, url]) => (
                    <div key={type} className="flex items-center gap-2 p-2 bg-muted rounded">
                      <span className="font-medium capitalize">{type}:</span>
                      <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm">
                        {url}
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vimeo" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Play className="w-5 h-5" />
                Teste do Player Vimeo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="vimeo-url">URL do Vimeo</Label>
                <div className="flex gap-2">
                  <Input
                    id="vimeo-url"
                    value={vimeoUrl}
                    onChange={(e) => setVimeoUrl(e.target.value)}
                    placeholder="https://vimeo.com/123456789"
                  />
                  <Button 
                    onClick={() => setVimeoUrl('https://vimeo.com/123456789')}
                    variant="outline"
                  >
                    Reset
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  Cole uma URL do Vimeo para testar o player
                </p>
              </div>

              <div className="border rounded-lg p-4">
                <h4 className="font-medium mb-4">Player Customizado:</h4>
                <CustomVideoPlayer
                  videoUrl={vimeoUrl}
                  onProgress={(percentage) => console.log('Progresso:', percentage)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fields" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Teste dos Campos de Vídeo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="youtube-id">YouTube ID</Label>
                  <Input
                    id="youtube-id"
                    value={testFields.youtube_id}
                    onChange={(e) => setTestFields(prev => ({ ...prev, youtube_id: e.target.value }))}
                    placeholder="ex: dQw4w9WgXcQ"
                  />
                  <p className="text-xs text-muted-foreground">
                    ID do vídeo do YouTube
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="vimeo-url-field">Vimeo URL</Label>
                  <Input
                    id="vimeo-url-field"
                    value={testFields.video_url}
                    onChange={(e) => setTestFields(prev => ({ ...prev, video_url: e.target.value }))}
                    placeholder="https://vimeo.com/123456789"
                  />
                  <p className="text-xs text-muted-foreground">
                    URL completa do Vimeo
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="video-file">Upload Vídeo</Label>
                  <Input
                    id="video-file"
                    type="file"
                    accept="video/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setTestFields(prev => ({ ...prev, video_file: file.name }));
                      }
                    }}
                  />
                  <p className="text-xs text-muted-foreground">
                    Arquivo de vídeo local
                  </p>
                </div>
              </div>

              <div className="p-4 bg-muted rounded">
                <h4 className="font-medium mb-2">Valores dos Campos:</h4>
                <pre className="text-sm">
                  {JSON.stringify(testFields, null, 2)}
                </pre>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="status" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Status das Integrações</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span>MinIO Storage</span>
                </div>
                <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span>Vimeo Player API</span>
                </div>
                <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span>YouTube Player API</span>
                </div>
                <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span>HTML5 Video Player</span>
                </div>
              </div>
              
              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded">
                <h4 className="font-medium text-blue-900 mb-2">Funcionalidades Disponíveis:</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Upload de vídeos para MinIO</li>
                  <li>• Reprodução de vídeos do Vimeo</li>
                  <li>• Reprodução de vídeos do YouTube</li>
                  <li>• Reprodução de vídeos hospedados</li>
                  <li>• Controles customizados para todos os players</li>
                  <li>• Tracking de progresso</li>
                  <li>• Navegação entre aulas</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 