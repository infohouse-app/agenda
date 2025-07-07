import { Server } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { notificationService, DeploymentNotification } from './notification-service';

export class WebSocketService {
  private wss: WebSocketServer;
  private clients: Set<WebSocket> = new Set();

  constructor(server: Server) {
    this.wss = new WebSocketServer({ 
      server,
      path: '/ws/notifications'
    });

    this.setupWebSocketServer();
    this.setupNotificationListener();
  }

  private setupWebSocketServer(): void {
    this.wss.on('connection', (ws: WebSocket, request) => {
      console.log('New WebSocket connection established');
      this.clients.add(ws);

      // Send recent notifications to new client
      const recentNotifications = notificationService.getNotifications(10);
      if (recentNotifications.length > 0) {
        this.sendToClient(ws, {
          type: 'history',
          data: recentNotifications
        });
      }

      // Handle client messages
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleClientMessage(ws, message);
        } catch (error) {
          console.error('Invalid WebSocket message:', error);
        }
      });

      // Handle client disconnect
      ws.on('close', () => {
        console.log('WebSocket connection closed');
        this.clients.delete(ws);
      });

      // Handle errors
      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        this.clients.delete(ws);
      });

      // Send welcome message
      this.sendToClient(ws, {
        type: 'connected',
        data: { message: 'Connected to notification service' }
      });
    });
  }

  private setupNotificationListener(): void {
    // Listen for new notifications
    notificationService.on('notification', (notification: DeploymentNotification) => {
      this.broadcast({
        type: 'notification',
        data: notification
      });
    });

    // Listen for notification clear events
    notificationService.on('notifications-cleared', () => {
      this.broadcast({
        type: 'notifications-cleared',
        data: {}
      });
    });
  }

  private handleClientMessage(ws: WebSocket, message: any): void {
    switch (message.type) {
      case 'ping':
        this.sendToClient(ws, { type: 'pong', data: {} });
        break;
      
      case 'get-notifications':
        const notifications = notificationService.getNotifications(message.limit || 50);
        this.sendToClient(ws, {
          type: 'notifications',
          data: notifications
        });
        break;
      
      case 'clear-notifications':
        notificationService.clearNotifications();
        break;
      
      case 'subscribe-deployment':
        // Client wants to subscribe to deployment updates
        this.sendToClient(ws, {
          type: 'subscribed',
          data: { event: 'deployment' }
        });
        break;
      
      default:
        console.log('Unknown message type:', message.type);
    }
  }

  private sendToClient(ws: WebSocket, message: any): void {
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify(message));
      } catch (error) {
        console.error('Error sending message to client:', error);
      }
    }
  }

  private broadcast(message: any): void {
    const messageStr = JSON.stringify(message);
    
    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(messageStr);
        } catch (error) {
          console.error('Error broadcasting message:', error);
          this.clients.delete(client);
        }
      } else {
        this.clients.delete(client);
      }
    });
  }

  public getConnectedClientsCount(): number {
    return this.clients.size;
  }

  public close(): void {
    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.close();
      }
    });
    this.clients.clear();
    this.wss.close();
  }
}

export let wsService: WebSocketService;