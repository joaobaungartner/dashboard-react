export const config = { 
  // Em dev usamos a API local na porta 8001 (conforme instruções)
  apiBaseUrl: window.location.origin === 'http://localhost:5173' ? 'http://localhost:8001' : 'URL CRIADA NO DEPLOY'
}