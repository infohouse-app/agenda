import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Calendar, Clock, X, Check, User, Phone, Mail, FileText, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { cn } from "@/lib/utils";

interface SchedulingPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

interface FormData {
  name: string;
  phone: string;
  email: string;
  service: string;
  notes: string;
}

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const SERVICE_OPTIONS = [
  { value: "consultation", label: "Consulta Geral" },
  { value: "followup", label: "Retorno" },
  { value: "procedure", label: "Procedimento" },
  { value: "exam", label: "Exame" },
];

export default function SchedulingPopup({ isOpen, onClose }: SchedulingPopupProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [formData, setFormData] = useState<FormData>({
    name: "",
    phone: "",
    email: "",
    service: "",
    notes: "",
  });
  const [showSuccess, setShowSuccess] = useState(false);
  const [confirmedAppointment, setConfirmedAppointment] = useState<any>(null);

  // Refs for auto scroll
  const modalRef = useRef<HTMLDivElement>(null);
  const timeSlotRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const confirmButtonRef = useRef<HTMLDivElement>(null);

  const { toast } = useToast();

  // Get available slots for selected date
  const { data: availability, isLoading: isLoadingSlots } = useQuery({
    queryKey: ['/api/availability', selectedDate],
    queryFn: async () => {
      if (!selectedDate) return null;
      const response = await fetch(`/api/availability/${selectedDate}`);
      if (!response.ok) throw new Error('Failed to fetch availability');
      return response.json();
    },
    enabled: !!selectedDate,
  });

  // Create appointment mutation
  const createAppointmentMutation = useMutation({
    mutationFn: async (data: any) => {
      console.log("Enviando para API:", data);
      const response = await apiRequest('POST', '/api/appointments', data);
      console.log("Resposta da API status:", response.status);
      const result = await response.json();
      console.log("Resposta da API data:", result);
      return result;
    },
    onSuccess: (data) => {
      console.log("Agendamento criado com sucesso:", data);
      setConfirmedAppointment(data);
      setShowSuccess(true);
      queryClient.invalidateQueries({ queryKey: ['/api/availability'] });
      toast({
        title: "Agendamento confirmado!",
        description: "Seu horário foi reservado com sucesso.",
      });
    },
    onError: (error: any) => {
      console.error("Erro na criação do agendamento:", error);
      toast({
        title: "Erro ao agendar",
        description: error.message || "Ocorreu um erro. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  // Auto scroll function
  const scrollToElement = (ref: React.RefObject<HTMLDivElement>, delay = 300) => {
    setTimeout(() => {
      if (ref.current && modalRef.current) {
        const modalRect = modalRef.current.getBoundingClientRect();
        const elementRect = ref.current.getBoundingClientRect();
        const scrollTop = modalRef.current.scrollTop;
        const targetScroll = scrollTop + elementRect.top - modalRect.top - 20;
        
        modalRef.current.scrollTo({
          top: targetScroll,
          behavior: 'smooth'
        });
      }
    }, delay);
  };

  // Auto scroll effects
  useEffect(() => {
    if (selectedDate) {
      scrollToElement(timeSlotRef, 200);
    }
  }, [selectedDate]);

  useEffect(() => {
    if (selectedTime) {
      scrollToElement(formRef, 200);
    }
  }, [selectedTime]);

  useEffect(() => {
    if (formData.name && formData.phone) {
      scrollToElement(confirmButtonRef, 200);
    }
  }, [formData.name, formData.phone]);

  // Check if all required fields are filled
  const canConfirm = selectedDate && selectedTime && formData.name && formData.phone && !createAppointmentMutation.isPending;

  const formatPhoneNumber = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 11) {
      return numbers.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    }
    return value;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setFormData(prev => ({ ...prev, phone: formatted }));
  };

  const formatDateForDisplay = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  };

  const generateCalendarDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const days = [];
    const currentDateStr = new Date().toISOString().split('T')[0];
    
    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      
      const dateStr = date.toISOString().split('T')[0];
      const isCurrentMonth = date.getMonth() === month;
      const isPast = dateStr < currentDateStr;
      const isSelected = dateStr === selectedDate;
      
      days.push({
        date: date.getDate(),
        dateStr,
        isCurrentMonth,
        isPast,
        isSelected,
        isAvailable: isCurrentMonth && !isPast,
      });
    }
    
    return days;
  };

  const handleDateSelect = (dateStr: string, isAvailable: boolean) => {
    if (!isAvailable) return;
    setSelectedDate(dateStr);
    setSelectedTime("");
  };

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time);
  };

  const handlePrevMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleConfirm = () => {
    console.log("Confirmar agendamento clicado");
    console.log("selectedDate:", selectedDate);
    console.log("selectedTime:", selectedTime);
    console.log("formData:", formData);
    
    if (!selectedDate || !selectedTime || !formData.name || !formData.phone) {
      console.log("Campos obrigatórios faltando");
      toast({
        title: "Campos obrigatórios",
        description: "Preencha nome, telefone, data e horário.",
        variant: "destructive",
      });
      return;
    }

    const appointmentData = {
      ...formData,
      date: selectedDate,
      time: selectedTime,
    };
    
    console.log("Enviando dados:", appointmentData);
    createAppointmentMutation.mutate(appointmentData);
  };

  const handleCloseSuccess = () => {
    setShowSuccess(false);
    setSelectedDate("");
    setSelectedTime("");
    setFormData({
      name: "",
      phone: "",
      email: "",
      service: "",
      notes: "",
    });
    onClose();
  };

  const calendarDays = generateCalendarDays();

  if (!isOpen && !showSuccess) return null;

  if (showSuccess) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="text-white text-2xl" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Agendamento Confirmado!</h3>
            <p className="text-gray-600 mb-4">Seu horário foi reservado com sucesso.</p>
            
            {confirmedAppointment && (
              <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Data:</span>
                    <span className="font-medium">{formatDateForDisplay(confirmedAppointment.date)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Horário:</span>
                    <span className="font-medium">{confirmedAppointment.time}</span>
                  </div>
                  {confirmedAppointment.service && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Serviço:</span>
                      <span className="font-medium">
                        {SERVICE_OPTIONS.find(s => s.value === confirmedAppointment.service)?.label}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex items-center justify-center space-x-4 text-sm text-gray-600 mb-6">
              <div className="flex items-center">
                <Calendar className="text-blue-500 mr-2 h-4 w-4" />
                <span>Adicionado ao Calendar</span>
              </div>
              <div className="flex items-center">
                <Phone className="text-green-500 mr-2 h-4 w-4" />
                <span>Confirmação enviada</span>
              </div>
            </div>

            <Button onClick={handleCloseSuccess} className="w-full">
              Entendi
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900">Agendar Horário</h2>
            <p className="text-gray-600 mt-1">Selecione a data e horário de sua preferência</p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div ref={modalRef} className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          
          {/* Calendar Section */}
          <div className="flex-1 p-6 border-r border-gray-200 overflow-y-auto">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <Calendar className="text-blue-500 mr-2 h-5 w-5" />
              Selecione a Data
            </h3>
            
            {/* Calendar Header */}
            <div className="flex items-center justify-between mb-4">
              <Button variant="ghost" size="sm" onClick={handlePrevMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <h4 className="text-lg font-medium text-gray-900">
                {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
              </h4>
              <Button variant="ghost" size="sm" onClick={handleNextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {WEEKDAYS.map(day => (
                <div key={day} className="text-center text-xs font-medium text-gray-500 py-2">
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day, index) => (
                <button
                  key={index}
                  onClick={() => handleDateSelect(day.dateStr, day.isAvailable)}
                  disabled={!day.isAvailable}
                  className={cn(
                    "p-3 text-sm rounded-lg transition-colors",
                    {
                      "text-gray-400 cursor-not-allowed": !day.isCurrentMonth || day.isPast,
                      "text-gray-900 hover:bg-blue-50": day.isAvailable && !day.isSelected,
                      "bg-blue-500 text-white": day.isSelected,
                    }
                  )}
                >
                  {day.date}
                </button>
              ))}
            </div>

            {/* Legend */}
            <div className="mt-4 flex items-center space-x-4 text-sm">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-blue-500 rounded mr-2"></div>
                <span className="text-gray-600">Selecionado</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-gray-300 rounded mr-2"></div>
                <span className="text-gray-600">Indisponível</span>
              </div>
            </div>
          </div>

          {/* Time Slots and Form Section */}
          <div className="flex-1 p-6 overflow-y-auto">
            <h3 ref={timeSlotRef} className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <Clock className="text-blue-500 mr-2 h-5 w-5" />
              {selectedDate ? `Horários Disponíveis - ${formatDateForDisplay(selectedDate)}` : 'Selecione uma data'}
            </h3>

            {selectedDate && (
              <>
                {/* Time Slots Grid */}
                {isLoadingSlots ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="h-12 bg-gray-200 rounded-lg animate-pulse" />
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
                    {(availability as any)?.availableSlots?.map((time: string) => (
                      <button
                        key={time}
                        onClick={() => handleTimeSelect(time)}
                        className={cn(
                          "p-3 text-sm rounded-lg transition-colors text-center",
                          {
                            "border border-gray-200 hover:border-blue-500 hover:bg-blue-50": selectedTime !== time,
                            "bg-blue-500 text-white": selectedTime === time,
                          }
                        )}
                      >
                        {time} {selectedTime === time && "✓"}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* Contact Form */}
            <div ref={formRef} className="border-t border-gray-200 pt-6">
              <h4 className="text-lg font-medium text-gray-900 mb-4">Seus Dados</h4>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Nome Completo *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Digite seu nome completo"
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label htmlFor="phone">WhatsApp *</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={handlePhoneChange}
                    placeholder="(11) 99999-9999"
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="seu@email.com"
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label htmlFor="service">Tipo de Serviço</Label>
                  <Select value={formData.service} onValueChange={(value) => setFormData(prev => ({ ...prev, service: value }))}>
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Selecione um serviço" />
                    </SelectTrigger>
                    <SelectContent>
                      {SERVICE_OPTIONS.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="notes">Observações</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Informações adicionais (opcional)"
                    rows={3}
                    className="mt-2 resize-none"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex-shrink-0 border-t border-gray-200 p-4 sm:p-6 bg-gray-50">
          {/* Progress Indicator */}
          <div className="mb-4">
            <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
              <span>Progresso do Agendamento</span>
              <span>{selectedDate && selectedTime && formData.name && formData.phone ? '100%' : 
                     selectedDate && selectedTime && (formData.name || formData.phone) ? '75%' :
                     selectedDate && selectedTime ? '50%' : 
                     selectedDate ? '25%' : '0%'}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${selectedDate && selectedTime && formData.name && formData.phone ? 100 : 
                          selectedDate && selectedTime && (formData.name || formData.phone) ? 75 :
                          selectedDate && selectedTime ? 50 : 
                          selectedDate ? 25 : 0}%`
                }}
              />
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
            
            {/* Selected Info */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              {selectedDate && (
                <div className="flex items-center px-3 py-2 bg-blue-50 rounded-lg">
                  <Calendar className="text-blue-600 mr-2 h-4 w-4" />
                  <span className="text-sm font-medium text-blue-900">{formatDateForDisplay(selectedDate)}</span>
                </div>
              )}
              {selectedTime && (
                <div className="flex items-center px-3 py-2 bg-green-50 rounded-lg">
                  <Clock className="text-green-600 mr-2 h-4 w-4" />
                  <span className="text-sm font-medium text-green-900">{selectedTime}</span>
                </div>
              )}
              {!selectedDate && !selectedTime && (
                <div className="text-sm text-gray-500">
                  Selecione data e horário para continuar
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div ref={confirmButtonRef} className="flex space-x-3">
              <Button 
                variant="outline" 
                onClick={onClose}
                className="px-6 py-2 text-gray-700 border-gray-300 hover:bg-gray-50"
              >
                Cancelar
              </Button>
              <Button 
                onClick={handleConfirm}
                disabled={!canConfirm}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {createAppointmentMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Processando...
                  </>
                ) : (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Confirmar Agendamento
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Integration Status */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center justify-center space-x-6 text-sm text-gray-500">
              <div className="flex items-center">
                <Calendar className="text-blue-500 mr-2 h-4 w-4" />
                <span>Google Calendar</span>
                <Check className="text-green-500 ml-2 h-4 w-4" />
              </div>
              <div className="flex items-center">
                <Phone className="text-green-500 mr-2 h-4 w-4" />
                <span>WhatsApp</span>
                <Check className="text-green-500 ml-2 h-4 w-4" />
              </div>
            </div>
          </div>
        </div>

        {/* Loading Overlay */}
        {createAppointmentMutation.isPending && (
          <div className="absolute inset-0 bg-black bg-opacity-75 z-10 flex items-center justify-center">
            <div className="bg-white rounded-2xl p-8 text-center max-w-sm mx-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Processando Agendamento</h3>
              <p className="text-gray-600 text-sm">Criando evento no Google Calendar e enviando confirmação...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
