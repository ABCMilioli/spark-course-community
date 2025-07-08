import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { 
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend, Area, AreaChart
} from 'recharts';
import { 
  CreditCard, DollarSign, TrendingUp, TrendingDown, 
  Download, Filter, Search, Calendar, Eye,
  CheckCircle, XCircle, Clock, AlertCircle
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';

interface PaymentStats {
  gateway: string;
  total_payments: number;
  total_amount: number;
  succeeded_payments: number;
  success_rate: number;
}

interface Payment {
  id: string;
  user_name?: string;
  user_email?: string;
  course_title: string;
  amount: number;
  status: string;
  gateway: string;
  created_at: string;
  stripe_payment_intent_id?: string;
}

interface PaymentMethod {
  id: string;
  name: string;
  enabled: boolean;
  type: string;
}

export default function PaymentManagement() {
  const { user } = useAuth();
  if (!user || user.role !== "admin") {
    return <Navigate to="/" replace />;
  }

  const [stats, setStats] = useState<PaymentStats[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filtros
  const [filterGateway, setFilterGateway] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPeriod, setFilterPeriod] = useState<string>('30');
  const [searchTerm, setSearchTerm] = useState<string>('');
  
  const { toast } = useToast();
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  useEffect(() => {
    loadData();
  }, [filterGateway, filterStatus, filterPeriod]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Token não encontrado');
      }

      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      };

      // Carregar dados em paralelo
      const [statsResponse, paymentsResponse, methodsResponse] = await Promise.all([
        fetch('/api/payments/stats', { headers }),
        fetch('/api/payments/history', { headers }),
        fetch('/api/payments/methods', { headers })
      ]);

      if (!statsResponse.ok) throw new Error(`Erro ao carregar estatísticas: ${statsResponse.status}`);
      if (!paymentsResponse.ok) throw new Error(`Erro ao carregar histórico: ${paymentsResponse.status}`);
      if (!methodsResponse.ok) throw new Error(`Erro ao carregar métodos: ${methodsResponse.status}`);

      const statsData = await statsResponse.json();
      const paymentsData = await paymentsResponse.json();
      const methodsData = await methodsResponse.json();

      setStats(statsData);
      setPayments(paymentsData);
      setMethods(methodsData);

    } catch (err) {
      console.error('Erro ao carregar dados:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  // Calcular estatísticas gerais
  const totalStats = stats.reduce((acc, stat) => ({
    total_payments: acc.total_payments + stat.total_payments,
    total_amount: acc.total_amount + stat.total_amount,
    succeeded_payments: acc.succeeded_payments + stat.succeeded_payments,
  }), { total_payments: 0, total_amount: 0, succeeded_payments: 0 });

  const overallSuccessRate = totalStats.total_payments > 0 
    ? (totalStats.succeeded_payments / totalStats.total_payments * 100)
    : 0;

  const pendingPayments = payments.filter(p => p.status === 'pending').length;
  const failedPayments = payments.filter(p => p.status === 'failed').length;

  // Filtrar pagamentos
  const filteredPayments = payments.filter(payment => {
    const matchesGateway = filterGateway === 'all' || payment.gateway === filterGateway;
    const matchesStatus = filterStatus === 'all' || payment.status === filterStatus;
    const matchesSearch = !searchTerm || 
      payment.course_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.user_email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Filtro por período
    const paymentDate = new Date(payment.created_at);
    const now = new Date();
    const daysAgo = parseInt(filterPeriod);
    const periodStart = new Date(now.getTime() - (daysAgo * 24 * 60 * 60 * 1000));
    const matchesPeriod = filterPeriod === 'all' || paymentDate >= periodStart;

    return matchesGateway && matchesStatus && matchesSearch && matchesPeriod;
  });

  // Dados para gráficos
  const statusData = [
    { name: 'Sucesso', value: totalStats.succeeded_payments, color: '#10b981' },
    { name: 'Pendente', value: pendingPayments, color: '#f59e0b' },
    { name: 'Falhou', value: failedPayments, color: '#ef4444' },
  ];

  const gatewayData = stats.map(stat => ({
    name: stat.gateway === 'stripe' ? 'Stripe' : 'Mercado Pago',
    value: stat.total_amount,
    payments: stat.total_payments,
    success_rate: stat.success_rate,
  }));

  // Dados para gráfico de linha (últimos 7 dias)
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    return date.toISOString().split('T')[0];
  });

  const dailyData = last7Days.map(date => {
    const dayPayments = payments.filter(p => p.created_at.split('T')[0] === date);
    return {
      date: new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      pagamentos: dayPayments.length,
      receita: dayPayments.reduce((sum, p) => sum + Number(p.amount), 0),
    };
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'succeeded': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'pending': return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'failed': return <XCircle className="h-4 w-4 text-red-500" />;
      default: return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      succeeded: 'default',
      pending: 'secondary',
      failed: 'destructive',
    } as const;

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'outline'}>
        {status === 'succeeded' ? 'Sucesso' : 
         status === 'pending' ? 'Pendente' : 
         status === 'failed' ? 'Falhou' : status}
      </Badge>
    );
  };

  const exportToCSV = () => {
    const csv = [
      ['Data', 'Usuário', 'Curso', 'Valor', 'Status', 'Gateway'].join(','),
      ...filteredPayments.map(payment => [
        new Date(payment.created_at).toLocaleDateString('pt-BR'),
        payment.user_name || '',
        payment.course_title,
        `R$ ${Number(payment.amount).toFixed(2)}`,
        payment.status,
        payment.gateway
      ].map(field => `"${field}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pagamentos-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    toast({
      title: "Exportação concluída",
      description: "Arquivo CSV baixado com sucesso!",
    });
  };

  // Função para abrir modal de detalhes
  const openPaymentDetails = (payment: Payment) => {
    setSelectedPayment(payment);
    setShowDetailsModal(true);
  };

  // Função para fechar modal
  const closePaymentDetails = () => {
    setShowDetailsModal(false);
    setSelectedPayment(null);
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center space-y-4">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
              <h3 className="text-lg font-semibold text-red-600">Erro ao carregar dados</h3>
              <p className="text-gray-600">{error}</p>
              <Button onClick={loadData}>Tentar novamente</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto p-2 sm:p-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-0">
        <div>
          <h1 className="text-xl sm:text-3xl font-bold">Gestão de Pagamentos</h1>
          <p className="text-sm sm:text-base text-gray-600">Dashboard administrativo de transações</p>
        </div>
        <Button onClick={exportToCSV} className="flex items-center gap-2 w-full sm:w-auto">
          <Download className="h-4 w-4" />
          Exportar CSV
        </Button>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-600">Total de Pagamentos</p>
                <p className="text-lg sm:text-2xl font-bold">{totalStats.total_payments}</p>
              </div>
              <CreditCard className="h-7 w-7 sm:h-8 sm:w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Receita Total</p>
                <p className="text-2xl font-bold">R$ {Number(totalStats.total_amount).toFixed(2)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Taxa de Sucesso</p>
                <p className="text-2xl font-bold">{Number(overallSuccessRate).toFixed(1)}%</p>
              </div>
              {overallSuccessRate >= 85 ? 
                <TrendingUp className="h-8 w-8 text-green-500" /> : 
                <TrendingDown className="h-8 w-8 text-red-500" />
              }
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pagamentos Pendentes</p>
                <p className="text-2xl font-bold">{pendingPayments}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Buscar por curso ou usuário..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={filterGateway} onValueChange={setFilterGateway}>
              <SelectTrigger>
                <SelectValue placeholder="Gateway" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Gateways</SelectItem>
                <SelectItem value="stripe">Stripe</SelectItem>
                <SelectItem value="mercadopago">Mercado Pago</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Status</SelectItem>
                <SelectItem value="succeeded">Sucesso</SelectItem>
                <SelectItem value="pending">Pendente</SelectItem>
                <SelectItem value="failed">Falhou</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterPeriod} onValueChange={setFilterPeriod}>
              <SelectTrigger>
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Últimos 7 dias</SelectItem>
                <SelectItem value="30">Últimos 30 dias</SelectItem>
                <SelectItem value="90">Últimos 90 dias</SelectItem>
                <SelectItem value="all">Todos os períodos</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" onClick={loadData}>
              Atualizar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabs com Dashboard e Histórico */}
      <Tabs defaultValue="dashboard" className="space-y-4">
        <TabsList>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="history">Histórico</TabsTrigger>
          <TabsTrigger value="methods">Métodos</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-4">
          {/* Gráficos */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Gráfico de Pizza - Status dos Pagamentos */}
            <Card>
              <CardHeader>
                <CardTitle>Distribuição por Status</CardTitle>
              </CardHeader>
              <CardContent>
                {statusData.every(entry => entry.value === 0) ? (
                  <div className="text-center text-muted-foreground py-12">Nenhum dado para exibir</div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={statusData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(Number(percent) * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {statusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Gráfico de Barras - Gateway */}
            <Card>
              <CardHeader>
                <CardTitle>Receita por Gateway</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={gatewayData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip 
                      formatter={(value, name) => [
                        name === 'value' ? `R$ ${Number(value).toFixed(2)}` : value,
                        name === 'value' ? 'Receita' : name
                      ]}
                    />
                    <Bar dataKey="value" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Gráfico de Linha - Tendência dos últimos 7 dias */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Tendência dos Últimos 7 Dias</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={dailyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip 
                      formatter={(value, name) => [
                        name === 'receita' ? `R$ ${Number(value).toFixed(2)}` : value,
                        name === 'receita' ? 'Receita' : 'Pagamentos'
                      ]}
                    />
                    <Legend />
                    <Area 
                      yAxisId="left" 
                      type="monotone" 
                      dataKey="pagamentos" 
                      stackId="1" 
                      stroke="#3b82f6" 
                      fill="#3b82f6" 
                      fillOpacity={0.6}
                      name="Pagamentos"
                    />
                    <Line 
                      yAxisId="right" 
                      type="monotone" 
                      dataKey="receita" 
                      stroke="#10b981" 
                      strokeWidth={3}
                      name="Receita"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <CreditCard className="h-5 w-5" />
                Histórico de Pagamentos ({filteredPayments.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table className="w-full">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Usuário</TableHead>
                      <TableHead>Curso</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Gateway</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPayments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell>
                          {new Date(payment.created_at).toLocaleDateString('pt-BR')}
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{payment.user_name || 'N/A'}</div>
                            <div className="text-sm text-gray-500">{payment.user_email || ''}</div>
                          </div>
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {payment.course_title}
                        </TableCell>
                        <TableCell>
                          R$ {Number(payment.amount).toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(payment.status)}
                            {getStatusBadge(payment.status)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {payment.gateway === 'stripe' ? 'Stripe' : 'Mercado Pago'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" onClick={() => openPaymentDetails(payment)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="methods">
          <Card>
            <CardHeader>
              <CardTitle>Métodos de Pagamento Disponíveis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {methods.map((method) => (
                  <Card key={method.id}>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold">{method.name}</h3>
                          <p className="text-sm text-gray-600">{method.type}</p>
                        </div>
                        <Badge variant={method.enabled ? 'default' : 'secondary'}>
                          {method.enabled ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal de Detalhes do Pagamento */}
      <Dialog open={showDetailsModal} onOpenChange={closePaymentDetails}>
        <DialogContent className="max-w-lg w-full">
          <DialogHeader>
            <DialogTitle>Detalhes do Pagamento</DialogTitle>
            <DialogDescription>
              Veja todas as informações deste pagamento.
            </DialogDescription>
          </DialogHeader>
          {selectedPayment && (
            <div className="space-y-2 py-2">
              <div><b>ID:</b> {selectedPayment.id}</div>
              <div><b>Usuário:</b> {selectedPayment.user_name || 'N/A'}</div>
              <div><b>Email:</b> {selectedPayment.user_email || 'N/A'}</div>
              <div><b>Curso:</b> {selectedPayment.course_title}</div>
              <div><b>Valor:</b> R$ {Number(selectedPayment.amount).toFixed(2)}</div>
              <div><b>Status:</b> {getStatusBadge(selectedPayment.status)}</div>
              <div><b>Gateway:</b> {selectedPayment.gateway === 'stripe' ? 'Stripe' : 'Mercado Pago'}</div>
              <div><b>Data:</b> {new Date(selectedPayment.created_at).toLocaleString('pt-BR')}</div>
              {selectedPayment.stripe_payment_intent_id && (
                <div><b>Stripe Payment Intent:</b> {selectedPayment.stripe_payment_intent_id}</div>
              )}
              {/* Adicione outros campos relevantes aqui */}
            </div>
          )}
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Fechar</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}; 