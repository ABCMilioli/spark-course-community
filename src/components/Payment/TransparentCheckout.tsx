import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CreditCard, QrCode, FileText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import { API_URL } from '@/lib/utils';

interface TransparentCheckoutProps {
  courseId: string;
  courseTitle: string;
  coursePrice: number | null;
}

export default function TransparentCheckout({ courseId, courseTitle, coursePrice = 0 }: TransparentCheckoutProps) {
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState('card');
  
  // Estado para cartão de crédito
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');
  const [docType, setDocType] = useState('CPF');
  const [docNumber, setDocNumber] = useState('');

  // Estado para PIX
  const [pixQrCode, setPixQrCode] = useState('');
  const [pixQrCodeBase64, setPixQrCodeBase64] = useState('');

  // Estado para boleto
  const [boletoUrl, setBoletoUrl] = useState('');
  const [boletoBarcode, setBoletoBarcode] = useState('');

  // Formatar número do cartão
  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = matches && matches[0] || '';
    const parts = [];

    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }

    if (parts.length) {
      return parts.join(' ');
    } else {
      return value;
    }
  };

  // Formatar data de expiração
  const formatExpiry = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    if (v.length >= 2) {
      return v.slice(0, 2) + '/' + v.slice(2, 6);
    }
    return v;
  };

  // Processar pagamento com cartão
  const handleCardPayment = async () => {
    try {
      setIsProcessing(true);

      const token = localStorage.getItem('token');
      const { data } = await axios.post(`${API_URL}/payments/mercadopago/process-card`, {
        course_id: courseId,
        card_data: {
          number: cardNumber.replace(/\s+/g, ''),
          name: cardName,
          expiry: cardExpiry,
          cvc: cardCvc,
          docType,
          docNumber
        }
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (data.status === 'approved') {
        toast.success('Pagamento aprovado!');
        navigate(`/payment/success?courseId=${courseId}&payment_id=${data.payment_id}`);
      } else {
        toast.error(`Pagamento não aprovado: ${data.status_detail}`);
        navigate(`/payment/failure?courseId=${courseId}&payment_id=${data.payment_id}&error_message=${data.status_detail}`);
      }

    } catch (error: any) {
      console.error('Erro ao processar pagamento:', error);
      toast.error(error.response?.data?.error || 'Erro ao processar pagamento');
    } finally {
      setIsProcessing(false);
    }
  };

  // Gerar PIX
  const handleGeneratePix = async () => {
    try {
      setIsProcessing(true);

      const token = localStorage.getItem('token');
      const { data } = await axios.post(`${API_URL}/payments/mercadopago/generate-pix`, {
        course_id: courseId
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setPixQrCode(data.qr_code);
      setPixQrCodeBase64(data.qr_code_base64);
      toast.success('PIX gerado com sucesso!');

    } catch (error: any) {
      console.error('Erro ao gerar PIX:', error);
      toast.error(error.response?.data?.error || 'Erro ao gerar PIX');
    } finally {
      setIsProcessing(false);
    }
  };

  // Gerar boleto
  const handleGenerateBoleto = async () => {
    try {
      setIsProcessing(true);

      if (!docNumber) {
        toast.error('CPF é obrigatório para gerar boleto');
        return;
      }

      const token = localStorage.getItem('token');
      const { data } = await axios.post(`${API_URL}/payments/mercadopago/generate-boleto`, {
        course_id: courseId,
        doc_number: docNumber
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setBoletoUrl(data.boleto_url);
      setBoletoBarcode(data.barcode);
      toast.success('Boleto gerado com sucesso!');

    } catch (error: any) {
      console.error('Erro ao gerar boleto:', error);
      toast.error(error.response?.data?.error || 'Erro ao gerar boleto');
    } finally {
      setIsProcessing(false);
    }
  };

  const formattedPrice = typeof coursePrice === 'number' ? coursePrice.toFixed(2) : '0.00';

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Pagamento do Curso</CardTitle>
        <CardDescription>
          {courseTitle} - R$ {formattedPrice}
        </CardDescription>
      </CardHeader>

      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="card" className="flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              Cartão
            </TabsTrigger>
            <TabsTrigger value="pix" className="flex items-center gap-2">
              <QrCode className="w-4 h-4" />
              PIX
            </TabsTrigger>
            <TabsTrigger value="boleto" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Boleto
            </TabsTrigger>
          </TabsList>

          {/* Formulário de Cartão */}
          <TabsContent value="card">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="cardNumber">Número do Cartão</Label>
                <Input
                  id="cardNumber"
                  placeholder="1234 5678 9012 3456"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                  maxLength={19}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cardName">Nome no Cartão</Label>
                <Input
                  id="cardName"
                  placeholder="Nome como está no cartão"
                  value={cardName}
                  onChange={(e) => setCardName(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cardExpiry">Validade</Label>
                  <Input
                    id="cardExpiry"
                    placeholder="MM/AA"
                    value={cardExpiry}
                    onChange={(e) => setCardExpiry(formatExpiry(e.target.value))}
                    maxLength={5}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cardCvc">CVC</Label>
                  <Input
                    id="cardCvc"
                    placeholder="123"
                    value={cardCvc}
                    onChange={(e) => setCardCvc(e.target.value.replace(/\D/g, ''))}
                    maxLength={4}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="docNumber">CPF</Label>
                <Input
                  id="docNumber"
                  placeholder="123.456.789-00"
                  value={docNumber}
                  onChange={(e) => setDocNumber(e.target.value.replace(/\D/g, ''))}
                  maxLength={11}
                />
              </div>

              <Button 
                className="w-full" 
                onClick={handleCardPayment}
                disabled={isProcessing || !cardNumber || !cardName || !cardExpiry || !cardCvc || !docNumber}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processando...
                  </>
                ) : (
                  'Pagar com Cartão'
                )}
              </Button>
            </div>
          </TabsContent>

          {/* PIX */}
          <TabsContent value="pix">
            <div className="space-y-4">
              {!pixQrCode ? (
                <Button 
                  className="w-full" 
                  onClick={handleGeneratePix}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Gerando PIX...
                    </>
                  ) : (
                    'Gerar PIX'
                  )}
                </Button>
              ) : (
                <div className="space-y-4 text-center">
                  <div className="bg-white p-4 rounded-lg">
                    <img 
                      src={`data:image/png;base64,${pixQrCodeBase64}`}
                      alt="QR Code PIX"
                      className="mx-auto"
                    />
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Escaneie o QR Code acima com o app do seu banco
                    </p>
                    <p className="text-xs text-muted-foreground">
                      O pagamento será confirmado automaticamente
                    </p>
                  </div>
                  <div className="pt-4 border-t">
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        setPixQrCode('');
                        setPixQrCodeBase64('');
                      }}
                    >
                      Gerar Novo PIX
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Boleto */}
          <TabsContent value="boleto">
            <div className="space-y-4">
              {!boletoUrl ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="boletoDoc">CPF</Label>
                    <Input
                      id="boletoDoc"
                      placeholder="123.456.789-00"
                      value={docNumber}
                      onChange={(e) => setDocNumber(e.target.value.replace(/\D/g, ''))}
                      maxLength={11}
                    />
                  </div>

                  <Button 
                    className="w-full" 
                    onClick={handleGenerateBoleto}
                    disabled={isProcessing || !docNumber}
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Gerando Boleto...
                      </>
                    ) : (
                      'Gerar Boleto'
                    )}
                  </Button>
                </>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Código de barras:
                    </p>
                    <p className="font-mono text-xs break-all bg-muted p-2 rounded">
                      {boletoBarcode}
                    </p>
                  </div>

                  <Button
                    className="w-full"
                    onClick={() => window.open(boletoUrl, '_blank')}
                  >
                    Abrir Boleto
                  </Button>

                  <div className="space-y-2 text-center">
                    <p className="text-sm text-muted-foreground">
                      O boleto pode levar até 3 dias úteis para ser compensado
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Após o pagamento, você receberá um e-mail de confirmação
                    </p>
                  </div>

                  <div className="pt-4 border-t">
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        setBoletoUrl('');
                        setBoletoBarcode('');
                      }}
                    >
                      Gerar Novo Boleto
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
} 