# Dashboard Kaiserhaus

Dashboard interativo para análise de dados financeiros, operacionais e de satisfação do cliente, desenvolvido com React, TypeScript e Vite.

## 📋 Tecnologias

- **React 19** - Biblioteca para construção da interface
- **TypeScript** - Tipagem estática
- **Vite** - Build tool e dev server
- **Recharts** - Biblioteca de gráficos
- **Styled Components** - Estilização CSS-in-JS
- **Tailwind CSS** - Framework de utilitários CSS

## 🚀 Como Rodar o Projeto

### Pré-requisitos

- Node.js (versão 18 ou superior)
- npm ou yarn
- Backend API rodando em `http://localhost:8001`

### Instalação

1. Clone o repositório ou navegue até a pasta do projeto:
```bash
cd dashboard-react
```

2. Instale as dependências:
```bash
npm install
```

### Execução

1. Inicie o servidor de desenvolvimento:
```bash
npm run dev
```

2. O projeto estará disponível em `http://localhost:5173` (ou outra porta se a 5173 estiver ocupada)

3. Certifique-se de que o backend está rodando em `http://localhost:8001`, pois o Vite está configurado para fazer proxy das requisições `/api` para o backend.

## 📝 Scripts Disponíveis

- `npm run dev` - Inicia o servidor de desenvolvimento com hot reload
- `npm run build` - Compila o projeto para produção
- `npm run preview` - Visualiza a build de produção localmente
- `npm run lint` - Executa o linter para verificar problemas no código

## 🏗️ Estrutura do Projeto

```
dashboard-react/
├── src/
│   ├── components/      # Componentes reutilizáveis (ex: Sidebar)
│   ├── pages/           # Páginas principais (Finance, Overview, Ops, Satisfaction)
│   ├── styles/          # Componentes styled-components
│   ├── utils/           # Utilitários (api.ts)
│   ├── config/          # Configurações
│   └── App.tsx          # Componente raiz
├── public/              # Arquivos estáticos
└── vite.config.ts       # Configuração do Vite
```

## ⚙️ Configuração

O projeto está configurado para fazer proxy das requisições de API. As configurações estão em `vite.config.ts`:

- **Proxy**: Requisições para `/api` são redirecionadas para `http://localhost:8001`

Se o backend estiver rodando em outra porta ou URL, edite o arquivo `vite.config.ts`:

```typescript
server: {
  proxy: {
    "/api": {
      target: "http://localhost:8001", // Altere aqui se necessário
      changeOrigin: true,
      secure: false,
    },
  },
}
```

## 📊 Dashboards Disponíveis

- **Overview** - Visão geral com KPIs principais e gráficos resumidos
- **Finance** - Análise financeira com receitas, margens e ticket médio
- **Ops** - Desempenho operacional com métricas de entrega e tempo
- **Satisfaction** - Análise de satisfação do cliente

## 🔧 Desenvolvimento

### Adicionar Nova Página

1. Crie um novo componente em `src/pages/`
2. Adicione a rota em `src/App.tsx`
3. Adicione um item no menu em `src/components/Sidebar.tsx`

### Estilização

O projeto utiliza `styled-components` para estilização. Os componentes reutilizáveis estão em `src/styles/styled-components.ts`.

## 📦 Build para Produção

Para gerar uma build de produção:

```bash
npm run build
```

Os arquivos serão gerados na pasta `dist/`.

Para visualizar a build localmente:

```bash
npm run preview
```

## 🐛 Troubleshooting

### Erro de conexão com o backend

- Verifique se o backend está rodando em `http://localhost:8001`
- Verifique se não há erros de CORS no console do navegador
- Confirme que o proxy está configurado corretamente no `vite.config.ts`

### Erro ao instalar dependências

- Tente limpar o cache do npm: `npm cache clean --force`
- Delete a pasta `node_modules` e o arquivo `package-lock.json`, depois execute `npm install` novamente

### Porta já está em uso

- O Vite tentará usar outra porta automaticamente
- Ou você pode especificar uma porta no comando: `npm run dev -- --port 3000`
