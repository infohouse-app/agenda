import { useState } from "react";
import { Calendar, Clock, Phone, CheckCircle, Settings, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import SchedulingPopup from "@/components/SchedulingPopup";
import ConfigurationModal from "@/components/ConfigurationModal";
import PasswordPrompt from "@/components/PasswordPrompt";

export default function Home() {
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isPasswordPromptOpen, setIsPasswordPromptOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const handleConfigClick = () => {
    if (isAuthenticated) {
      setIsConfigOpen(true);
    } else {
      setIsPasswordPromptOpen(true);
    }
  };

  const handlePasswordSuccess = () => {
    setIsAuthenticated(true);
    setIsConfigOpen(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        
        {/* Configuration Button */}
        <div className="fixed top-6 right-6 z-40">
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleConfigClick}
            className="bg-white shadow-lg hover:shadow-xl"
          >
            {isAuthenticated ? (
              <Settings className="mr-2 h-4 w-4" />
            ) : (
              <Lock className="mr-2 h-4 w-4" />
            )}
            Configurações
          </Button>
        </div>
        
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            Sistema de Agendamento
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Agende seus horários de forma rápida e fácil com integração ao Google Calendar e confirmação via WhatsApp.
          </p>
          <Button 
            size="lg" 
            onClick={() => setIsPopupOpen(true)}
            className="text-lg px-8 py-6 rounded-xl"
          >
            <Calendar className="mr-2 h-5 w-5" />
            Agendar Horário
          </Button>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <Card className="text-center hover:shadow-lg transition-shadow">
            <CardHeader>
              <Calendar className="h-12 w-12 text-blue-500 mx-auto mb-4" />
              <CardTitle>Google Calendar</CardTitle>
              <CardDescription>
                Integração completa com Google Calendar para sincronização automática
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="text-center hover:shadow-lg transition-shadow">
            <CardHeader>
              <Phone className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <CardTitle>WhatsApp</CardTitle>
              <CardDescription>
                Confirmação automática via WhatsApp com todos os detalhes do agendamento
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="text-center hover:shadow-lg transition-shadow">
            <CardHeader>
              <Clock className="h-12 w-12 text-amber-500 mx-auto mb-4" />
              <CardTitle>Horários Flexíveis</CardTitle>
              <CardDescription>
                Sistema inteligente que mostra apenas horários disponíveis
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* How it works */}
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Como Funciona
          </h2>
          
          <div className="grid md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-500 text-white rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                1
              </div>
              <h3 className="font-semibold mb-2">Escolha a Data</h3>
              <p className="text-gray-600 text-sm">Selecione a data desejada no calendário</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-blue-500 text-white rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                2
              </div>
              <h3 className="font-semibold mb-2">Selecione o Horário</h3>
              <p className="text-gray-600 text-sm">Veja os horários disponíveis e escolha o melhor</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-blue-500 text-white rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                3
              </div>
              <h3 className="font-semibold mb-2">Preencha os Dados</h3>
              <p className="text-gray-600 text-sm">Informe seus dados de contato e observações</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-green-500 text-white rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-8 w-8" />
              </div>
              <h3 className="font-semibold mb-2">Confirmação</h3>
              <p className="text-gray-600 text-sm">Receba a confirmação no WhatsApp e Calendar</p>
            </div>
          </div>
        </div>

        {/* Integration Status */}
        <div className="mt-16 text-center">
          <Card className="max-w-md mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center justify-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                Integrações Ativas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center space-x-6 text-sm">
                <div className="flex items-center">
                  <Calendar className="text-blue-500 mr-2 h-4 w-4" />
                  <span>Google Calendar</span>
                  <CheckCircle className="text-green-500 ml-2 h-4 w-4" />
                </div>
                <div className="flex items-center">
                  <Phone className="text-green-500 mr-2 h-4 w-4" />
                  <span>WhatsApp</span>
                  <CheckCircle className="text-green-500 ml-2 h-4 w-4" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <SchedulingPopup 
        isOpen={isPopupOpen} 
        onClose={() => setIsPopupOpen(false)} 
      />
      
      <PasswordPrompt
        isOpen={isPasswordPromptOpen}
        onClose={() => setIsPasswordPromptOpen(false)}
        onSuccess={handlePasswordSuccess}
      />
      
      <ConfigurationModal 
        isOpen={isConfigOpen} 
        onClose={() => setIsConfigOpen(false)} 
      />
    </div>
  );
}
