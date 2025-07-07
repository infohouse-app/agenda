import { EventEmitter } from 'events';

export interface DeploymentNotification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: Date;
  stage?: string;
  progress?: number;
  details?: any;
}

export class NotificationService extends EventEmitter {
  private notifications: DeploymentNotification[] = [];
  private maxNotifications = 100;

  constructor() {
    super();
    this.setMaxListeners(0); // Unlimited listeners
  }

  // Send notification to all connected clients
  public notify(notification: Omit<DeploymentNotification, 'id' | 'timestamp'>): void {
    const fullNotification: DeploymentNotification = {
      ...notification,
      id: this.generateId(),
      timestamp: new Date(),
    };

    // Store notification
    this.notifications.unshift(fullNotification);
    if (this.notifications.length > this.maxNotifications) {
      this.notifications = this.notifications.slice(0, this.maxNotifications);
    }

    // Emit to all listeners
    this.emit('notification', fullNotification);

    // Log to console for debugging
    console.log(`[NOTIFICATION] ${fullNotification.type.toUpperCase()}: ${fullNotification.title}`);
    if (fullNotification.message) {
      console.log(`[NOTIFICATION] ${fullNotification.message}`);
    }
  }

  // Deployment-specific notification methods
  public deploymentStarted(environment: string): void {
    this.notify({
      type: 'info',
      title: 'Deployment Started',
      message: `Starting deployment to ${environment}`,
      stage: 'initialization',
      progress: 0,
    });
  }

  public deploymentProgress(stage: string, progress: number, message?: string): void {
    this.notify({
      type: 'info',
      title: `Deployment Progress: ${stage}`,
      message: message || `${stage} in progress (${progress}%)`,
      stage,
      progress,
    });
  }

  public deploymentSuccess(environment: string, url?: string): void {
    this.notify({
      type: 'success',
      title: 'Deployment Successful',
      message: `Successfully deployed to ${environment}${url ? ` - ${url}` : ''}`,
      stage: 'completed',
      progress: 100,
      details: { environment, url },
    });
  }

  public deploymentError(stage: string, error: string, details?: any): void {
    this.notify({
      type: 'error',
      title: 'Deployment Failed',
      message: `Error during ${stage}: ${error}`,
      stage,
      details: { error, ...details },
    });
  }

  public deploymentWarning(stage: string, message: string): void {
    this.notify({
      type: 'warning',
      title: 'Deployment Warning',
      message: `Warning during ${stage}: ${message}`,
      stage,
    });
  }

  // Service status notifications
  public serviceStarted(serviceName: string): void {
    this.notify({
      type: 'success',
      title: 'Service Started',
      message: `${serviceName} is now running`,
    });
  }

  public serviceError(serviceName: string, error: string): void {
    this.notify({
      type: 'error',
      title: 'Service Error',
      message: `${serviceName} encountered an error: ${error}`,
    });
  }

  public serviceRestarted(serviceName: string): void {
    this.notify({
      type: 'info',
      title: 'Service Restarted',
      message: `${serviceName} has been restarted`,
    });
  }

  // OAuth and API notifications
  public oauthSuccess(provider: string): void {
    this.notify({
      type: 'success',
      title: 'OAuth Connected',
      message: `Successfully connected to ${provider}`,
    });
  }

  public oauthError(provider: string, error: string): void {
    this.notify({
      type: 'error',
      title: 'OAuth Failed',
      message: `Failed to connect to ${provider}: ${error}`,
    });
  }

  public apiConfigured(apiName: string): void {
    this.notify({
      type: 'success',
      title: 'API Configured',
      message: `${apiName} API has been configured successfully`,
    });
  }

  // Get notifications history
  public getNotifications(limit = 50): DeploymentNotification[] {
    return this.notifications.slice(0, limit);
  }

  // Clear notifications
  public clearNotifications(): void {
    this.notifications = [];
    this.emit('notifications-cleared');
  }

  // Generate unique ID
  private generateId(): string {
    return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Global notification service instance
export const notificationService = new NotificationService();