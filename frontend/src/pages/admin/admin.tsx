import { useEffect, useState, ReactNode } from 'react';
import { Header } from '@/components/custom/header';
import { fetchMetrics } from '@/services/api';

export function Admin() {
  const [metrics, setMetrics] = useState<Record<string, ReactNode> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const getMetrics = async () => {
      try {
        const data = await fetchMetrics();
        setMetrics(data);
      } catch (err) {
        setError('Failed to fetch metrics');
      } finally {
        setLoading(false);
      }
    };
    getMetrics();
  }, []);

  const capitalizeFirstLetter = (string: string) => {
    return string.charAt(0).toUpperCase() + string.slice(1);
  };

  return (
    <div className="flex flex-col min-w-0 h-dvh bg-background">
      <Header />
      <div className="flex flex-col items-center justify-center flex-1 px-4 py-8">
        <h1 className="text-3xl font-bold mb-2">Admin Metrics</h1>
        {loading && <p>Loading...</p>}
        {error && <p className="text-red-500">{error}</p>}
        {metrics && (
          <div className="text-left p-4 rounded-md">
            {Object.entries(metrics).map(([key, value]) => (
              <p key={key} className="mb-2">
                <span className="font-bold">{capitalizeFirstLetter(key)}:</span> {value}
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
