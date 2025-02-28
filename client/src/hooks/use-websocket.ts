import { useEffect, useRef, useCallback, useState } from 'react';

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();

  const connect = useCallback(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    wsRef.current = new WebSocket(wsUrl);

    wsRef.current.onopen = () => {
      console.log('WebSocket connection established');
      setIsConnected(true);
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };

    wsRef.current.onclose = () => {
      console.log('WebSocket connection closed');
      setIsConnected(false);
      // Attempt to reconnect after 2 seconds
      reconnectTimeoutRef.current = setTimeout(connect, 2000);
    };

    wsRef.current.onerror = (error) => {
      console.error('WebSocket error:', error);
      wsRef.current?.close();
    };
  }, []);

  useEffect(() => {
    connect();
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [connect]);

  const send = useCallback((type: string, data: any) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.warn('WebSocket is not connected, attempting to reconnect...');
      connect();
      return;
    }

    try {
      const message = JSON.stringify({ type, ...data });
      wsRef.current.send(message);
    } catch (error) {
      console.error('Error sending WebSocket message:', error);
    }
  }, [connect]);

  const subscribe = useCallback((callback: (data: any) => void) => {
    if (!wsRef.current) return;

    wsRef.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data && typeof data === 'object') {
          callback(data);
        } else {
          console.warn('Received invalid WebSocket message format:', event.data);
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };
  }, []);

  return { send, subscribe, isConnected };
}