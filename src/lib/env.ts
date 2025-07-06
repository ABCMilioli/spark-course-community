// Utilitário para acessar variáveis de ambiente do frontend
// Este arquivo lê as variáveis do objeto window.env gerado pelo container

interface EnvConfig {
  VITE_API_URL: string;
  NODE_ENV: string;
}

// Função para obter configuração de ambiente
export function getEnvConfig(): EnvConfig {
  // Verificar se window.env existe (arquivo env.js foi carregado)
  if (typeof window !== 'undefined' && (window as any).env) {
    return (window as any).env as EnvConfig;
  }

  // Fallback para desenvolvimento local ou se env.js não foi carregado
  return {
    VITE_API_URL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api',
    NODE_ENV: import.meta.env.NODE_ENV || 'development'
  };
}

// Função para obter URL da API
export function getApiUrl(): string {
  const config = getEnvConfig();
  return config.VITE_API_URL;
}

// Função para verificar se está em produção
export function isProduction(): boolean {
  const config = getEnvConfig();
  return config.NODE_ENV === 'production';
}

// Função para verificar se está em desenvolvimento
export function isDevelopment(): boolean {
  const config = getEnvConfig();
  return config.NODE_ENV === 'development';
} 