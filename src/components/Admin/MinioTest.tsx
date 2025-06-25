import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Upload, TestTube, FileImage, Video, FileText, User } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || '/api';

export function MinioTest() {
  const [isTesting, setIsTesting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

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
    if (!selectedFile) {
      toast.error('Selecione um arquivo primeiro');
      return;
    }

    setIsUploading(true);
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await axios.post(`${API_URL}/upload/${type}`, formData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      setUploadResult(response.data);
      toast.success('Upload realizado com sucesso!');
    } catch (error: any) {
      console.error('Erro no upload:', error);
      setUploadResult({ 
        success: false, 
        error: error.response?.data?.error || 'Erro desconhecido',
        details: error.response?.data?.details || error.message
      });
      toast.error('Erro no upload');
    } finally {
      setIsUploading(false);
    }
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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TestTube className="w-5 h-5" />
            Teste de Conectividade MinIO
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={testMinioConnection} 
            disabled={isTesting}
            className="w-full"
          >
            {isTesting ? 'Testando...' : 'Testar Conectividade'}
          </Button>

          {testResult && (
            <div className="mt-4 p-4 rounded-lg border">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant={testResult.success ? "default" : "destructive"}>
                  {testResult.success ? "Sucesso" : "Erro"}
                </Badge>
                <span className="text-sm font-medium">
                  {testResult.success ? "Conectividade OK" : "Falha na Conexão"}
                </span>
              </div>
              
              {testResult.success && testResult.buckets && (
                <div className="text-sm text-muted-foreground">
                  <p>Buckets encontrados: {testResult.buckets.join(', ')}</p>
                </div>
              )}
              
              {testResult.error && (
                <div className="text-sm text-red-600">
                  <p><strong>Erro:</strong> {testResult.error}</p>
                  {testResult.details && (
                    <p><strong>Detalhes:</strong> {testResult.details}</p>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Teste de Upload
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Input
              type="file"
              onChange={handleFileChange}
              accept="image/*,video/*"
              className="w-full"
            />
            {selectedFile && (
              <p className="text-sm text-muted-foreground mt-2">
                Arquivo selecionado: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button 
              onClick={() => uploadFile('thumbnail')} 
              disabled={!selectedFile || isUploading}
              size="sm"
              className="flex items-center gap-2"
            >
              <FileImage className="w-4 h-4" />
              Thumbnail
            </Button>
            
            <Button 
              onClick={() => uploadFile('video')} 
              disabled={!selectedFile || isUploading}
              size="sm"
              className="flex items-center gap-2"
            >
              <Video className="w-4 h-4" />
              Vídeo
            </Button>
            
            <Button 
              onClick={() => uploadFile('material')} 
              disabled={!selectedFile || isUploading}
              size="sm"
              className="flex items-center gap-2"
            >
              <FileText className="w-4 h-4" />
              Material
            </Button>
            
            <Button 
              onClick={() => uploadFile('avatar')} 
              disabled={!selectedFile || isUploading}
              size="sm"
              className="flex items-center gap-2"
            >
              <User className="w-4 h-4" />
              Avatar
            </Button>
          </div>

          {uploadResult && (
            <div className="mt-4 p-4 rounded-lg border">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant={uploadResult.success ? "default" : "destructive"}>
                  {uploadResult.success ? "Sucesso" : "Erro"}
                </Badge>
                <span className="text-sm font-medium">
                  {uploadResult.success ? "Upload Realizado" : "Falha no Upload"}
                </span>
              </div>
              
              {uploadResult.success && (
                <div className="space-y-2">
                  <p className="text-sm"><strong>URL:</strong> {uploadResult.url}</p>
                  <p className="text-sm"><strong>Arquivo:</strong> {uploadResult.fileName}</p>
                  <p className="text-sm"><strong>Tamanho:</strong> {(uploadResult.size / 1024 / 1024).toFixed(2)} MB</p>
                  
                  {uploadResult.url && uploadResult.url.match(/\.(jpg|jpeg|png|gif)$/i) && (
                    <div className="mt-2">
                      <img 
                        src={uploadResult.url} 
                        alt="Preview" 
                        className="max-w-full h-32 object-cover rounded"
                      />
                    </div>
                  )}
                </div>
              )}
              
              {uploadResult.error && (
                <div className="text-sm text-red-600">
                  <p><strong>Erro:</strong> {uploadResult.error}</p>
                  {uploadResult.details && (
                    <p><strong>Detalhes:</strong> {uploadResult.details}</p>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 