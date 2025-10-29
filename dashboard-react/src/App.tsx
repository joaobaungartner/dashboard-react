import Apitest from "./components/Apitest";

export default function App() {
  return (
    <div className="min-h-screen bg-gray-100">
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">
            Dashboard
          </h1>
          <p className="text-gray-600 mb-8">
            Bem-vindo ao seu dashboard
          </p>
          <Apitest />
        </div>
      </div>
    </div>
  );
}
