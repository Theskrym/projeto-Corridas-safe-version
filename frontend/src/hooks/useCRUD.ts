import { useState, useEffect, useRef } from 'react';
import api from '../api/axios';

interface UseCRUDOptions<T> {
  endpoint: string;
  id?: string | number;
  transformData?: (data: any) => T;
  transformPayload?: (data: T) => any;
}

interface UseCRUDReturn<T> {
  data: T;
  isLoading: boolean;
  error: string | null;
  isNew: boolean;
  setData: (data: T) => void;
  save: () => Promise<any>;
}

export function useCRUD<T>(
  initialData: T,
  options: UseCRUDOptions<T>
): UseCRUDReturn<T> {
  const [data, setData] = useState<T>(initialData);
  const [isLoading, setIsLoading] = useState(!!(options.id)); // Only load if editing
  const [error, setError] = useState<string | null>(null);
  const hasLoadedRef = useRef(false); // Track if we've already attempted to load
  const isNew = !options.id;

  // Load existing data if editing
  useEffect(() => {
    if (isNew || hasLoadedRef.current) {
      return; // Don't load if creating or already loaded
    }

    const loadData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await api.get(`${options.endpoint}${options.id}/`);
        
        if (options.transformData) {
          setData(options.transformData(response.data));
        } else {
          setData(response.data);
        }
      } catch (err: any) {
        setError(err.response?.data?.message || 'Erro ao carregar dados');
      } finally {
        setIsLoading(false);
        hasLoadedRef.current = true; // Mark as loaded
      }
    };

    loadData();
  }, [isNew, options.id]); // Removed options.endpoint and options.transformData to prevent loops

  // Save (create or update)
  const save = async () => {
    try {
      setError(null);
      const payload = options.transformPayload ? options.transformPayload(data) : data;

      if (isNew) {
        // Create
        const response = await api.post(options.endpoint, payload);
        return response.data;
      } else {
        // Update
        const response = await api.patch(`${options.endpoint}${options.id}/`, payload);
        return response.data;
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 
                      err.response?.data?.detail ||
                      err.message || 
                      'Erro ao salvar';
      setError(errorMsg);
      throw err;
    }
  };

  return {
    data,
    isLoading,
    error,
    isNew,
    setData,
    save,
  };
}
