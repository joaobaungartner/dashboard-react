export const config = { 
  // Em dev usamos o proxy do Vite (vite.config.ts) que redireciona /api para localhost:8001
  // Em produção, defina a URL completa da API aqui
  apiBaseUrl: window.location.origin.startsWith('http://localhost') ? '' : ''
}