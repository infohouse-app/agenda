import { db } from './db';
import { oauthTokens } from '@shared/schema';
import { eq } from 'drizzle-orm';

interface GoogleTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope?: string;
  token_type: string;
}

interface GoogleOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export class GoogleOAuthService {
  private config: GoogleOAuthConfig;

  constructor(config: GoogleOAuthConfig) {
    this.config = config;
  }

  // Gerar URL de autorização
  getAuthorizationUrl(): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      scope: 'https://www.googleapis.com/auth/calendar',
      response_type: 'code',
      access_type: 'offline', // Para obter refresh_token
      prompt: 'consent', // Força consentimento para garantir refresh_token
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
  }

  // Trocar código de autorização por tokens
  async exchangeCodeForTokens(code: string): Promise<GoogleTokenResponse> {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        redirect_uri: this.config.redirectUri,
        grant_type: 'authorization_code',
        code: code,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OAuth token exchange failed: ${error}`);
    }

    return await response.json();
  }

  // Atualizar token usando refresh_token
  async refreshAccessToken(refreshToken: string): Promise<GoogleTokenResponse> {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Token refresh failed: ${error}`);
    }

    return await response.json();
  }

  // Salvar tokens no banco
  async saveTokens(tokens: GoogleTokenResponse): Promise<void> {
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    // Verificar se já existe um token para Google Calendar
    const [existingToken] = await db
      .select()
      .from(oauthTokens)
      .where(eq(oauthTokens.provider, 'google_calendar'))
      .limit(1);

    if (existingToken) {
      // Atualizar token existente
      await db
        .update(oauthTokens)
        .set({
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token || existingToken.refreshToken,
          expiresAt: expiresAt,
          scope: tokens.scope,
          updatedAt: new Date(),
        })
        .where(eq(oauthTokens.id, existingToken.id));
    } else {
      // Criar novo registro
      await db.insert(oauthTokens).values({
        provider: 'google_calendar',
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token!,
        expiresAt: expiresAt,
        scope: tokens.scope,
      });
    }
  }

  // Obter token válido (atualiza automaticamente se expirado)
  async getValidAccessToken(): Promise<string | null> {
    try {
      const [tokenRecord] = await db
        .select()
        .from(oauthTokens)
        .where(eq(oauthTokens.provider, 'google_calendar'))
        .limit(1);

      if (!tokenRecord) {
        return null;
      }

      // Verificar se o token ainda é válido (com margem de 5 minutos)
      const now = new Date();
      const marginTime = new Date(tokenRecord.expiresAt.getTime() - 5 * 60 * 1000);

      if (now < marginTime) {
        // Token ainda válido
        return tokenRecord.accessToken;
      }

      // Token expirado, tentar renovar
      console.log('Token expirado, renovando...');
      const refreshedTokens = await this.refreshAccessToken(tokenRecord.refreshToken);
      
      // Salvar novos tokens
      await this.saveTokens(refreshedTokens);
      
      return refreshedTokens.access_token;
    } catch (error) {
      console.error('Erro ao obter token válido:', error);
      return null;
    }
  }

  // Verificar se há token salvo
  async hasValidToken(): Promise<boolean> {
    const token = await this.getValidAccessToken();
    return token !== null;
  }

  // Revogar token (logout)
  async revokeToken(): Promise<void> {
    try {
      const [tokenRecord] = await db
        .select()
        .from(oauthTokens)
        .where(eq(oauthTokens.provider, 'google_calendar'))
        .limit(1);

      if (tokenRecord) {
        // Revogar no Google
        await fetch(`https://oauth2.googleapis.com/revoke?token=${tokenRecord.refreshToken}`, {
          method: 'POST',
        });

        // Remover do banco
        await db
          .delete(oauthTokens)
          .where(eq(oauthTokens.id, tokenRecord.id));
      }
    } catch (error) {
      console.error('Erro ao revogar token:', error);
    }
  }

  // Testar conexão com Google Calendar
  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      const accessToken = await this.getValidAccessToken();
      
      if (!accessToken) {
        return {
          success: false,
          message: 'Nenhum token de acesso disponível. Faça a autorização primeiro.',
        };
      }

      // Testar listando calendários
      const response = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json() as { items?: any[] };
        return {
          success: true,
          message: `Conexão bem-sucedida! ${data.items?.length || 0} calendários encontrados.`,
        };
      } else {
        const error = await response.text();
        return {
          success: false,
          message: `Erro na conexão: ${response.status} - ${error}`,
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `Erro inesperado: ${error}`,
      };
    }
  }
}