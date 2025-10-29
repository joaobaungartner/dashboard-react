import React, { useState, useEffect } from "react";

interface ApiData {
  [key: string]: any;
}

const Apitest: React.FC = () => {
  const [data, setData] = useState<ApiData[]>([]);
  const [meta, setMeta] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState<boolean>(false);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/data');
      
      if (!response.ok) {
        throw new Error(`Erro na API: ${response.status} ${response.statusText}`);
      }
      
      const jsonData = await response.json();
      console.log('Dados recebidos da API:', jsonData);
      
      if (jsonData.data && Array.isArray(jsonData.data)) {
        console.log('Dados encontrados:', jsonData.data.length, 'registros');
        setData(jsonData.data);
        setMeta(jsonData.meta);
      } else if (Array.isArray(jsonData)) {
        console.log('Dados diretos encontrados:', jsonData.length, 'registros');
        setData(jsonData);
        setMeta(null);
      } else {
        console.error('Formato não esperado:', jsonData);
        throw new Error('Formato de dados não esperado da API');
      }
      
      setIsVisible(true);
    } catch (err) {
      let errorMessage = 'Erro desconhecido';
      
      if (err instanceof Error) {
        if (err.message.includes('CORS') || err.message.includes('Failed to fetch')) {
          errorMessage = 'Erro de CORS: A API não está permitindo requisições do frontend. Verifique se o backend está rodando e configurado para aceitar requisições de localhost:5174';
        } else {
          errorMessage = err.message;
        }
      }
      
      setError(errorMessage);
      console.error('Erro ao buscar dados:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setIsVisible(false);
    setData([]);
    setMeta(null);
  };

  if (!isVisible) {
    return (
      <div className="text-center">
        <button
          onClick={fetchData}
          disabled={loading}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
        >
          {loading ? 'Carregando...' : 'Carregar Dados da API'}
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-gray-800">
          Dados da API (Excel → JSON)
        </h2>
        <button
          onClick={handleClose}
          className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
        >
          Fechar
        </button>
      </div>

      {loading && (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <p className="mt-2 text-gray-600">Carregando dados...</p>
        </div>
      )}

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <strong>Erro:</strong> {error}
        </div>
      )}

      {data.length > 0 && (
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="px-6 py-4 bg-gray-50 border-b">
            <h3 className="text-lg font-semibold text-gray-800">
              Dados da API em formato JSON
            </h3>
            {meta && (
              <div className="mt-2 text-sm text-gray-600">
                <p>Total de registros: {meta.total}</p>
                <p>Mostrando: {meta.returned} de {meta.total} registros</p>
                <p>Offset: {meta.offset} • Limit: {meta.limit}</p>
              </div>
            )}
          </div>
          
          <div className="p-6">
            <pre className="bg-gray-100 p-4 rounded-lg overflow-auto text-sm text-gray-800 max-h-96">
              {JSON.stringify(data, null, 2)}
            </pre>
          </div>
        </div>
      )}

      {data.length === 0 && !loading && !error && (
        <div className="text-center py-8 text-gray-500">
          Nenhum dado para exibir.
        </div>
      )}
    </div>
  );
};

export default Apitest;