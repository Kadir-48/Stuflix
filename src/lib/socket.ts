import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(window.location.origin, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    });

    socket.on('connect', () => {
      console.log('[Socket connect] Connected to server with ID:', socket?.id);
    });

    socket.on('disconnect', (reason) => {
      console.warn('[Socket disconnect] Disconnected from server:', reason);
    });

    socket.on('connect_error', (err) => {
      console.warn('[Socket error] Connection failed:', err.message);
    });

    socket.on('reconnect', (attemptNumber) => {
      console.log('[Socket reconnect] Successfully reconnected after attempt:', attemptNumber);
    });

    socket.on('reconnect_attempt', (attemptNumber) => {
      console.log('[Socket reconnect] Attempting reconnection #', attemptNumber);
    });
  }
  return socket;
}
