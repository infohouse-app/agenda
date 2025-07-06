import { useState, useEffect } from "react";
import { Settings, Save, Eye, EyeOff, Check, X, AlertCircle, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useMutation, useQuery } from "@tanstack/react-query";

interface ConfigurationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ConfigData {
  googleCalendar: {
    enabled: boolean;
    calendarId: string;
    accessToken: string;
    clientId: string;
    clientSecret: string;
    useOAuth: boolean;
  };
  whatsapp: {
    enabled: boolean;
    apiKey: string;
    phoneId: string;
    webhookUrl: string;
  };
}

export default function ConfigurationModal({ isOpen, onClose }: ConfigurationModalProps) {
  const [config, setConfig] = useState<ConfigData>({
    googleCalendar: {
      enabled: true,
      calendarId: "primary",
      accessToken: "",
      clientId: "",
      clientSecret: "",
      useOAuth: false,
    },
    whatsapp: {
      enabled: true,
      apiKey: "",
      phoneId: "",
      webhookUrl: "",
    },
  });

  const [showPasswords, setShowPasswords] = useState({
    googleAccessToken: false,
    whatsappApiKey: false,
  });

  const [testResults, setTestResults] = useState({
    google: null as boolean | null,
    whatsapp: null as boolean | null,
  });

  const [oauthStatus, setOauthStatus] = useState({
    authorized: false,
    connection: { success: false, message: '' }
  });

  const { toast } = useToast();

  // Carregar configurações existentes
  const { data: currentConfig } = useQuery({
    queryKey: ['/api/config'],
    enabled: isOpen,
  });

  // Salvar configurações
  const saveConfigMutation = useMutation({
    mutationFn: async (data: ConfigData) => {
      const response = await apiRequest('POST', '/api/config', data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Configurações salvas",
        description: "As configurações foram salvas com sucesso.",
      });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao salvar",
        description: error.message || "Erro ao salvar configurações.",
        variant: "destructive",
      });
    },
  });

  // Testar conexões
  const testGoogleMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/test-google', {
        calendarId: config.googleCalendar.calendarId,
        accessToken: config.googleCalendar.accessToken,
      });
      return response.json();
    },
    onSuccess: () => {
      setTestResults(prev => ({ ...prev, google: true }));
      toast({
        title: "Google Calendar conectado",
        description: "Conexão com Google Calendar bem-sucedida.",
      });
    },
    onError: () => {
      setTestResults(prev => ({ ...prev, google: false }));
      toast({
        title: "Erro no Google Calendar",
        description: "Verifique suas credenciais do Google Calendar.",
        variant: "destructive",
      });
    },
  });

  const testWhatsAppMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/test-whatsapp', {
        apiKey: config.whatsapp.apiKey,
        phoneId: config.whatsapp.phoneId,
        webhookUrl: config.whatsapp.webhookUrl,
      });
      return response.json();
    },
    onSuccess: () => {
      setTestResults(prev => ({ ...prev, whatsapp: true }));
      toast({
        title: "WhatsApp conectado",
        description: "Conexão com WhatsApp bem-sucedida.",
      });
    },
    onError: () => {
      setTestResults(prev => ({ ...prev, whatsapp: false }));
      toast({
        title: "Erro no WhatsApp",
        description: "Verifique suas credenciais do WhatsApp.",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (currentConfig && typeof currentConfig === 'object') {
      const typedConfig = currentConfig as any;
      if (typedConfig.googleCalendar || typedConfig.whatsapp) {
        setConfig({
          googleCalendar: {
            enabled: typedConfig.googleCalendar?.enabled ?? true,
            calendarId: typedConfig.googleCalendar?.calendarId ?? "primary",
            accessToken: typedConfig.googleCalendar?.accessToken ?? "",
            clientId: typedConfig.googleCalendar?.clientId ?? "",
            clientSecret: typedConfig.googleCalendar?.clientSecret ?? "",
            useOAuth: typedConfig.googleCalendar?.useOAuth ?? false,
          },
          whatsapp: {
            enabled: typedConfig.whatsapp?.enabled ?? true,
            apiKey: typedConfig.whatsapp?.apiKey ?? "",
            phoneId: typedConfig.whatsapp?.phoneId ?? "",
            webhookUrl: typedConfig.whatsapp?.webhookUrl ?? "",
          },
        });
      }
    }
  }, [currentConfig]);

  const handleSave = () => {
    saveConfigMutation.mutate(config);
  };

  const togglePasswordVisibility = (field: keyof typeof showPasswords) => {
    setShowPasswords(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const updateConfig = (section: keyof ConfigData, field: string, value: any) => {
    setConfig(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value,
      },
    }));
  };

  const handleGoogleOAuthFlow = async () => {
    try {
      // Primeiro, salvar as credenciais
      await saveConfigMutation.mutateAsync(config);
      
      // Então, iniciar o fluxo OAuth
      const response = await fetch('/api/oauth/google/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: config.googleCalendar.clientId,
          clientSecret: config.googleCalendar.clientSecret,
        }),
      });
      
      if (response.ok) {
        const data = await response.json() as { authUrl: string };
        // Abrir em nova aba para autorização
        window.open(data.authUrl, '_blank');
        
        toast({
          title: "Autorização iniciada",
          description: "Complete a autorização na nova aba e retorne aqui.",
        });
      } else {
        throw new Error('Erro ao iniciar autorização');
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao iniciar autorização OAuth",
        variant: "destructive",
      });
    }
  };

  // Check OAuth status
  const checkOAuthStatus = async () => {
    try {
      const response = await fetch('/api/oauth/google/status');
      if (response.ok) {
        const status = await response.json() as {
          authorized: boolean;
          connection: { success: boolean; message: string };
        };
        setOauthStatus(status);
      }
    } catch (error) {
      console.error('Erro ao verificar status OAuth:', error);
    }
  };

  // Check OAuth status when modal opens and useOAuth is enabled
  useEffect(() => {
    if (isOpen && config.googleCalendar.useOAuth) {
      checkOAuthStatus();
    }
  }, [isOpen, config.googleCalendar.useOAuth]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 flex items-center">
              <Settings className="mr-3 h-6 w-6 text-blue-500" />
              Configurações de Integração
            </h2>
            <p className="text-gray-600 mt-1">Configure as chaves de API para Google Calendar e WhatsApp</p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex-1 p-6 overflow-y-auto">
          <Tabs defaultValue="google" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="google">Google Calendar</TabsTrigger>
              <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
            </TabsList>

            {/* Google Calendar Configuration */}
            <TabsContent value="google" className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center">
                        Google Calendar
                        {testResults.google === true && <Check className="ml-2 h-4 w-4 text-green-500" />}
                        {testResults.google === false && <X className="ml-2 h-4 w-4 text-red-500" />}
                      </CardTitle>
                      <CardDescription>
                        Configure a integração com Google Calendar para criar eventos automaticamente
                      </CardDescription>
                    </div>
                    <Switch
                      checked={config.googleCalendar.enabled}
                      onCheckedChange={(checked) => updateConfig('googleCalendar', 'enabled', checked)}
                    />
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* OAuth Method Selection */}
                  <div className="border rounded-lg p-4 bg-blue-50">
                    <div className="flex items-center space-x-2 mb-3">
                      <Switch
                        checked={config.googleCalendar.useOAuth}
                        onCheckedChange={(checked) => updateConfig('googleCalendar', 'useOAuth', checked)}
                      />
                      <Label className="font-medium">
                        {config.googleCalendar.useOAuth ? 'OAuth2 Permanente (Recomendado)' : 'Token Manual'}
                      </Label>
                    </div>
                    <p className="text-sm text-blue-700">
                      {config.googleCalendar.useOAuth 
                        ? 'Configure OAuth2 para tokens que renovam automaticamente. Ideal para produção.'
                        : 'Use token manual do Google OAuth Playground. Expira em 1 hora.'}
                    </p>
                  </div>

                  {config.googleCalendar.useOAuth ? (
                    <>
                      {/* OAuth2 Permanent Setup */}
                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          <strong>OAuth2 Permanente:</strong> Configure Client ID e Client Secret do Google Cloud Console. 
                          Os tokens serão renovados automaticamente.
                        </AlertDescription>
                      </Alert>

                      <div>
                        <Label htmlFor="client-id">Client ID *</Label>
                        <Input
                          id="client-id"
                          value={config.googleCalendar.clientId}
                          onChange={(e) => updateConfig('googleCalendar', 'clientId', e.target.value)}
                          placeholder="198772343236-o2oc9ndc23g9962e4f4ue54bn7dng1vo.apps.googleusercontent.com"
                          className="mt-2"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Obtido no Google Cloud Console → APIs & Services → Credentials
                        </p>
                      </div>

                      <div>
                        <Label htmlFor="client-secret">Client Secret *</Label>
                        <div className="relative mt-2">
                          <Input
                            id="client-secret"
                            type={showPasswords.googleAccessToken ? "text" : "password"}
                            value={config.googleCalendar.clientSecret}
                            onChange={(e) => updateConfig('googleCalendar', 'clientSecret', e.target.value)}
                            placeholder="GOCSPX-..."
                            className="pr-10"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3"
                            onClick={() => togglePasswordVisibility('googleAccessToken')}
                          >
                            {showPasswords.googleAccessToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          Client Secret do seu projeto no Google Cloud Console
                        </p>
                      </div>

                      {config.googleCalendar.clientId && config.googleCalendar.clientSecret && (
                        <div className={`p-4 rounded-lg ${oauthStatus.authorized ? 'bg-green-50' : 'bg-blue-50'}`}>
                          {oauthStatus.authorized ? (
                            <div>
                              <p className="text-sm text-green-700 mb-2">
                                <strong>✅ Autorizado:</strong> Google Calendar conectado com sucesso
                              </p>
                              <p className="text-xs text-green-600 mb-3">
                                {oauthStatus.connection.message}
                              </p>
                              <div className="flex gap-2">
                                <Button 
                                  onClick={checkOAuthStatus}
                                  variant="outline"
                                  size="sm"
                                  className="border-green-300 text-green-700"
                                >
                                  Verificar Conexão
                                </Button>
                                <Button 
                                  onClick={handleGoogleOAuthFlow}
                                  variant="outline"
                                  size="sm"
                                  className="border-blue-300 text-blue-700"
                                >
                                  Reautorizar
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div>
                              <p className="text-sm text-blue-700 mb-2">
                                <strong>Próximo passo:</strong> Autorize o acesso ao Google Calendar
                              </p>
                              <Button 
                                onClick={handleGoogleOAuthFlow}
                                className="bg-blue-600 hover:bg-blue-700"
                              >
                                <Calendar className="mr-2 h-4 w-4" />
                                Autorizar Google Calendar
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      {/* Manual Token Setup */}
                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          <strong>Token Manual:</strong> Use o Google OAuth Playground para gerar seu token. 
                          Expira em 1 hora e deve ser renovado manualmente.
                        </AlertDescription>
                      </Alert>
                    </>
                  )}
                  


                  <div>
                    <Label htmlFor="calendar-id">ID do Calendar</Label>
                    <Input
                      id="calendar-id"
                      value={config.googleCalendar.calendarId}
                      onChange={(e) => updateConfig('googleCalendar', 'calendarId', e.target.value)}
                      placeholder="primary (ou ID específico do calendar)"
                      className="mt-2"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Use "primary" para o calendar principal ou obtenha o ID em Google Calendar → Settings
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="access-token">Access Token OAuth2 *</Label>
                    <div className="relative mt-2">
                      <Input
                        id="access-token"
                        type={showPasswords.googleAccessToken ? "text" : "password"}
                        value={config.googleCalendar.accessToken}
                        onChange={(e) => updateConfig('googleCalendar', 'accessToken', e.target.value)}
                        placeholder="ya29.a0AfB_byCloudV3..."
                        className="pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => togglePasswordVisibility('googleAccessToken')}
                      >
                        {showPasswords.googleAccessToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                    <div className="text-xs text-gray-500 mt-1 space-y-1">
                      <p><strong>⚠️ IMPORTANTE:</strong> O token expira em 1 hora!</p>
                      <p>• Access: <a href="https://developers.google.com/oauthplayground" target="_blank" className="text-blue-500 underline">Google OAuth Playground</a></p>
                      <p>• Cole <strong>https://www.googleapis.com/auth/calendar</strong> no Step 1</p>
                      <p>• Autorize e obtenha o Access Token no Step 2</p>
                    </div>
                  </div>

                  <Button
                    onClick={() => testGoogleMutation.mutate()}
                    disabled={!config.googleCalendar.accessToken || testGoogleMutation.isPending}
                    variant="outline"
                    className="w-full"
                  >
                    {testGoogleMutation.isPending ? "Testando..." : "Testar Conexão"}
                  </Button>
                </CardContent>
              </Card>

              {/* Instruções para Google Calendar */}
              <Card>
                <CardHeader>
                  <CardTitle>Como configurar Google Calendar API</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-gray-600">
                  <div>
                    <strong>1. Acesse o Google Cloud Console:</strong>
                    <p>Vá para console.cloud.google.com e crie/selecione um projeto</p>
                  </div>
                  <div>
                    <strong>2. Ative a Calendar API:</strong>
                    <p>APIs & Services → Library → Procure "Calendar API" → Enable</p>
                  </div>
                  <div>
                    <strong>3. Obtenha Access Token OAuth2:</strong>
                    <div className="bg-blue-50 p-3 rounded mt-2">
                      <p className="font-medium">✅ Passo a passo para token válido:</p>
                      <ol className="list-decimal list-inside space-y-1 mt-2 text-sm">
                        <li>Acesse: <a href="https://developers.google.com/oauthplayground" target="_blank" className="text-blue-600 underline">Google OAuth Playground</a></li>
                        <li>Cole este scope: <code className="bg-gray-200 px-1">https://www.googleapis.com/auth/calendar</code></li>
                        <li>Clique "Authorize APIs" e faça login com sua conta Google</li>
                        <li>Clique "Exchange authorization code for tokens"</li>
                        <li>Copie o "Access token" que começa com "ya29..."</li>
                        <li>Cole o token no campo acima</li>
                      </ol>
                      <p className="text-red-600 text-sm mt-2">⚠️ Token expira em 1 hora - gere novo quando necessário</p>
                    </div>
                  </div>

                </CardContent>
              </Card>
            </TabsContent>

            {/* WhatsApp Configuration */}
            <TabsContent value="whatsapp" className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center">
                        Evolution API - WhatsApp
                        {testResults.whatsapp === true && <Check className="ml-2 h-4 w-4 text-green-500" />}
                        {testResults.whatsapp === false && <X className="ml-2 h-4 w-4 text-red-500" />}
                      </CardTitle>
                      <CardDescription>
                        Configure sua Evolution API para envio automático de confirmações via WhatsApp
                      </CardDescription>
                    </div>
                    <Switch
                      checked={config.whatsapp.enabled}
                      onCheckedChange={(checked) => updateConfig('whatsapp', 'enabled', checked)}
                    />
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="evolution-url">URL da Evolution API *</Label>
                    <Input
                      id="evolution-url"
                      value={config.whatsapp.apiKey}
                      onChange={(e) => updateConfig('whatsapp', 'apiKey', e.target.value)}
                      placeholder="https://sua-evolution-api.com"
                      className="mt-2"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      URL base da sua instância Evolution API
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="instance-name">Nome da Instância *</Label>
                    <Input
                      id="instance-name"
                      value={config.whatsapp.phoneId}
                      onChange={(e) => updateConfig('whatsapp', 'phoneId', e.target.value)}
                      placeholder="minha-instancia"
                      className="mt-2"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Nome da instância configurada na Evolution API
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="api-key">API Key da Evolution *</Label>
                    <div className="relative mt-2">
                      <Input
                        id="api-key"
                        type={showPasswords.whatsappApiKey ? "text" : "password"}
                        value={config.whatsapp.webhookUrl}
                        onChange={(e) => updateConfig('whatsapp', 'webhookUrl', e.target.value)}
                        placeholder="sua-api-key-evolution"
                        className="pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => togglePasswordVisibility('whatsappApiKey')}
                      >
                        {showPasswords.whatsappApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Chave de API para autenticação na Evolution API
                    </p>
                  </div>

                  <Button
                    onClick={() => testWhatsAppMutation.mutate()}
                    disabled={!config.whatsapp.apiKey || !config.whatsapp.phoneId || !config.whatsapp.webhookUrl || testWhatsAppMutation.isPending}
                    variant="outline"
                    className="w-full"
                  >
                    {testWhatsAppMutation.isPending ? "Testando..." : "Testar Conexão"}
                  </Button>
                </CardContent>
              </Card>

              {/* Instruções para Evolution API */}
              <Card>
                <CardHeader>
                  <CardTitle>Como configurar Evolution API</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-gray-600">
                  <div>
                    <strong>1. URL da API:</strong>
                    <p>Informe o endereço completo da sua Evolution API (ex: https://api.meusite.com)</p>
                  </div>
                  <div>
                    <strong>2. Nome da Instância:</strong>
                    <p>Use o mesmo nome configurado quando criou a instância no painel Evolution</p>
                  </div>
                  <div>
                    <strong>3. API Key:</strong>
                    <p>Chave de autenticação encontrada nas configurações da Evolution API</p>
                  </div>
                  <div>
                    <strong>4. Testando a conexão:</strong>
                    <p>Use o botão "Testar Conexão" para verificar se os dados estão corretos</p>
                  </div>
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <strong className="text-blue-800">💡 Dica:</strong>
                    <p className="text-blue-700">Certifique-se de que sua Evolution API está online e acessível pela internet</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saveConfigMutation.isPending}>
            <Save className="mr-2 h-4 w-4" />
            {saveConfigMutation.isPending ? "Salvando..." : "Salvar Configurações"}
          </Button>
        </div>
      </div>
    </div>
  );
}