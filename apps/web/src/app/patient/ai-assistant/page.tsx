'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/auth-context';
import { apiClient, ApiError } from '@/lib/api-client';
import { TriageUrgency, UserRole } from '@healthsync/shared-types';
import {
  Bot,
  Send,
  AlertTriangle,
  RefreshCw,
  PhoneCall,
  MessageSquare,
  Plus,
  LogIn,
  AlertCircle,
  RotateCcw,
  Globe,
  Clock,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';

interface ChatMessage {
  id?: string;
  sender: 'USER' | 'ASSISTANT';
  content: string;
  triageUrgency?: TriageUrgency;
  isRedFlagWarning?: boolean;
  emergencyDirectives?: string[];
  disclaimer?: string;
  timestamp?: string;
}

interface ConversationSummary {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages?: ChatMessage[];
}

export default function AIAssistantPage() {
  const { user, isLoading: authLoading, demoLogin } = useAuth();
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | undefined>(undefined);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState<'en' | 'hi' | 'hinglish'>('en');
  const [isSending, setIsSending] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [errorMessage, setErrorMessage] = useState<{
    type: 'auth' | 'provider' | 'validation' | 'generic';
    title: string;
    details: string;
    instructions?: string[];
  } | null>(null);
  const [lastFailedDraft, setLastFailedDraft] = useState<string | null>(null);
  const [aiStatus, setAiStatus] = useState<any>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const samplePrompts = [
    {
      title: 'Longitudinal Report Comparison',
      text: 'Compare my last two reports and show what improved.',
      tag: 'Lab Analysis',
      color: 'bg-teal-50 text-teal-800 border-teal-200',
      lang: 'en',
    },
    {
      title: 'Routine Care Inquiry',
      text: 'What foods should I avoid with high blood pressure?',
      tag: 'Routine Care',
      color: 'bg-blue-50 text-blue-700 border-blue-200',
      lang: 'en',
    },
    {
      title: 'Emergency Red-Flag Test',
      text: 'I have severe crushing chest pain radiating to my left arm and jaw',
      tag: 'Emergency Trigger',
      color: 'bg-red-50 text-red-700 border-red-200',
      lang: 'en',
    },
    {
      title: 'Stroke FAST Protocol',
      text: 'My father has sudden face drooping and slurred speech',
      tag: 'Emergency Trigger',
      color: 'bg-red-50 text-red-700 border-red-200',
      lang: 'en',
    },
    {
      title: 'Medication Safety Guardrail',
      text: 'Should I stop taking my amlodipine since I feel completely fine?',
      tag: 'Guardrail Warning',
      color: 'bg-amber-50 text-amber-700 border-amber-200',
      lang: 'en',
    },
    {
      title: 'Hinglish Symptom Query',
      text: 'Mujhe 3 din se bukhar hai aur weakness lag rahi hai, kya karu?',
      tag: 'Hinglish Support',
      color: 'bg-purple-50 text-purple-700 border-purple-200',
      lang: 'hinglish',
    },
    {
      title: 'Hindi Clinical Guidance',
      text: 'उच्च रक्तचाप के मरीज को क्या खाना चाहिए?',
      tag: 'हिंदी Support',
      color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      lang: 'hi',
    },
  ];

  // 1. Fetch AI Provider Status
  useEffect(() => {
    async function loadStatus() {
      try {
        const res = await apiClient('/api/ai/status');
        if (res.data) setAiStatus(res.data);
      } catch {
        setAiStatus({
          isAvailable: false,
          activeProvider: 'Google Gemini (Cloud AI)',
          model: 'gemini-flash-latest',
        });
      }
    }
    loadStatus();
  }, []);

  // 2. Fetch User Conversations when Authenticated
  useEffect(() => {
    if (!user) return;

    async function loadConversations() {
      try {
        const res = await apiClient('/api/ai/conversations');
        if (res.data && Array.isArray(res.data)) {
          setConversations(res.data);
        }
      } catch {
        // Fallback silently if no past conversations exist
      }
    }

    loadConversations();
  }, [user]);

  // 3. Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSending]);

  // 4. Switch or Load Conversation Thread
  const loadConversationThread = async (convId: string) => {
    if (convId === activeConversationId || isSending) return;
    setIsLoadingHistory(true);
    setErrorMessage(null);

    try {
      const res = await apiClient(`/api/ai/conversations/${convId}`);
      if (res.data) {
        setActiveConversationId(res.data.id);
        const loadedMessages: ChatMessage[] = (res.data.messages || []).map((m: any) => ({
          id: m.id,
          sender: m.sender,
          content: m.content,
          triageUrgency: m.triageUrgency,
          isRedFlagWarning: m.isRedFlagWarning,
          emergencyDirectives: m.emergencyDirectives ? JSON.parse(m.emergencyDirectives) : undefined,
          disclaimer: m.disclaimer,
          timestamp: m.createdAt,
        }));
        setMessages(loadedMessages);
      }
    } catch (err: any) {
      if (err.status === 403) {
        setErrorMessage({
          type: 'auth',
          title: 'Access Denied',
          details: 'You do not have authorization to view this conversation.',
        });
      } else {
        setErrorMessage({
          type: 'generic',
          title: 'Failed to load conversation',
          details: err.message || 'Unable to retrieve conversation thread.',
        });
      }
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // 5. Start New Conversation
  const startNewConversation = () => {
    setActiveConversationId(undefined);
    setMessages([]);
    setErrorMessage(null);
    setLastFailedDraft(null);
  };

  // 6. Send Message Handler with Draft Preservation & Error Differentiation
  const handleSend = async (messageText?: string) => {
    const textToSend = (messageText !== undefined ? messageText : inputValue).trim();
    if (!textToSend || isSending) return;

    if (!user) {
      setErrorMessage({
        type: 'auth',
        title: 'Authentication Required',
        details: 'You must be logged into a patient account to use the AI Health Assistant.',
      });
      return;
    }

    if (textToSend.length > 2000) {
      setErrorMessage({
        type: 'validation',
        title: 'Message Too Long',
        details: 'Please shorten your message. The maximum allowed length is 2000 characters.',
      });
      return;
    }

    setErrorMessage(null);
    setLastFailedDraft(null);

    // Optimistic user message
    const optimisticMsg: ChatMessage = {
      sender: 'USER',
      content: textToSend,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    setInputValue('');
    setIsSending(true);

    try {
      const res = await apiClient('/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: textToSend,
          conversationId: activeConversationId,
          language: selectedLanguage,
        }),
      });

      if (res.data) {
        setActiveConversationId(res.data.conversationId);

        // Update conversations sidebar list if new thread
        setConversations((prev) => {
          const exists = prev.some((c) => c.id === res.data.conversationId);
          if (!exists) {
            return [
              {
                id: res.data.conversationId,
                title: textToSend.length > 35 ? textToSend.substring(0, 32) + '...' : textToSend,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              },
              ...prev,
            ];
          }
          return prev;
        });

        const assistantMsg: ChatMessage = {
          id: res.data.message.id,
          sender: 'ASSISTANT',
          content: res.data.message.content,
          triageUrgency: res.data.message.triageUrgency,
          isRedFlagWarning: res.data.message.isRedFlagWarning,
          emergencyDirectives: res.data.message.emergencyDirectives,
          disclaimer: res.data.message.disclaimer,
          timestamp: res.data.message.createdAt || new Date().toISOString(),
        };

        setMessages((prev) => [...prev, assistantMsg]);
      }
    } catch (err: any) {
      // Preserve failed draft so user does not lose their typed message
      setLastFailedDraft(textToSend);
      setInputValue(textToSend);

      // Remove the optimistic user message to prevent UI confusion
      setMessages((prev) => prev.slice(0, prev.length - 1));

      if (err.status === 401) {
        setErrorMessage({
          type: 'auth',
          title: 'Session Expired',
          details: 'Your session has expired. Please sign in again to continue.',
        });
      } else if (err.status === 403) {
        setErrorMessage({
          type: 'auth',
          title: 'Access Forbidden',
          details: 'You do not have permission to access or continue this conversation.',
        });
      } else if (err.status === 503) {
        setErrorMessage({
          type: 'provider',
          title: 'AI Provider Offline / Unconfigured',
          details: err.message || `The configured AI model (${aiStatus?.activeProvider || 'Google Gemini'}) is currently unreachable.`,
          instructions: err.data?.setupInstructions || [
            '1. Ensure GEMINI_API_KEY is configured in apps/api/.env',
            '2. Ensure AI_PROVIDER=gemini is set in apps/api/.env',
            '3. In Google AI Studio / Google Cloud Console, ensure "Generative Language API" is enabled.',
          ],
        });
      } else if (err.status === 400) {
        setErrorMessage({
          type: 'validation',
          title: 'Invalid Request',
          details: err.message || 'The server rejected the message format.',
        });
      } else {
        setErrorMessage({
          type: 'generic',
          title: 'Communication Error',
          details: err.message || 'An unexpected error occurred while communicating with the server.',
        });
      }
    } finally {
      setIsSending(false);
    }
  };

  // Auth Gate: Loading State
  if (authLoading) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 flex flex-col items-center justify-center space-y-4">
        <RefreshCw className="w-8 h-8 text-brand-600 animate-spin" />
        <p className="text-sm font-semibold text-slate-600">Verifying security credentials...</p>
      </div>
    );
  }

  // Auth Gate: Unauthenticated Visitor Banner
  if (!user) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center space-y-6">
        <div className="w-16 h-16 rounded-3xl bg-brand-50 text-brand-600 flex items-center justify-center mx-auto shadow-md">
          <Bot className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-slate-900">HealthSync Care Assistant</h1>
          <p className="text-sm text-slate-600 max-w-lg mx-auto">
            To provide safe medical information, isolate personal records, and protect patient confidentiality,
            the AI Assistant requires an authenticated patient session.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm max-w-md mx-auto space-y-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 p-2.5 rounded-xl border border-emerald-200">
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span>Encrypted patient context & 112 emergency routing active</span>
          </div>

          <div className="flex flex-col gap-2.5 pt-2">
            <Link
              href="/login"
              className="w-full py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold shadow-sm flex items-center justify-center gap-2 transition-colors"
            >
              <LogIn className="w-4 h-4" />
              <span>Sign In to Your Patient Account</span>
            </Link>

            <button
              onClick={() => demoLogin(UserRole.PATIENT)}
              className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-300 transition-colors"
            >
              One-Click Patient Demo Login (Aarav Sharma)
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
      {/* Top Banner & AI Provider Telemetry */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-teal-500 text-white flex items-center justify-center shadow-md shadow-brand-500/20">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
              <span>HealthSync Care Assistant</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-brand-50 text-brand-700 border border-brand-200">
                112 Emergency Triage Active
              </span>
            </h1>
            <p className="text-xs text-slate-500">
              Offline-first medical information with strict consent isolation & patient context
            </p>
          </div>
        </div>

        {/* AI Provider Status Pill */}
        <div className="flex items-center gap-3 self-start sm:self-center">
          <div className="text-right">
            <div className="text-[11px] font-semibold text-slate-700 flex items-center gap-1.5 justify-end">
              <span className={`w-2 h-2 rounded-full ${aiStatus?.isAvailable ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`}></span>
              <span>{aiStatus?.activeProvider || 'Google Gemini (Cloud AI)'}</span>
            </div>
            <div className="text-[10px] text-slate-400">
              Model: {aiStatus?.model || 'gemini-flash-latest'} • Status: {aiStatus?.isAvailable ? 'Online' : 'Unconfigured / Offline'}
            </div>
          </div>
        </div>
      </div>

      {/* Main Workspace Layout (Sidebar + Chat Area) */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 items-start">
        {/* Left Column: Conversation History Sidebar */}
        <div className="lg:col-span-1 bg-white border border-slate-200 rounded-2xl p-3 shadow-sm flex flex-col h-[580px]">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
              <MessageSquare className="w-4 h-4 text-brand-600" />
              <span>Consultations</span>
            </div>
            <button
              onClick={startNewConversation}
              className="p-1.5 rounded-lg bg-brand-50 hover:bg-brand-100 text-brand-700 text-xs font-semibold flex items-center gap-1 transition-colors"
              title="Start New Conversation"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New</span>
            </button>
          </div>

          {/* Conversation List */}
          <div className="flex-1 overflow-y-auto space-y-1 py-2">
            {conversations.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400">
                No past consultations yet.
              </div>
            ) : (
              conversations.map((c) => (
                <button
                  key={c.id}
                  onClick={() => loadConversationThread(c.id)}
                  className={`w-full text-left p-2.5 rounded-xl text-xs transition-all flex items-center justify-between ${
                    c.id === activeConversationId
                      ? 'bg-brand-50 text-brand-900 font-bold border border-brand-200 shadow-xs'
                      : 'hover:bg-slate-50 text-slate-700 border border-transparent'
                  }`}
                >
                  <div className="truncate pr-1">
                    <p className="truncate font-medium">{c.title || 'Consultation thread'}</p>
                    <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                      <Clock className="w-2.5 h-2.5" />
                      {new Date(c.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                </button>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Active Chat Panel */}
        <div className="lg:col-span-3 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col h-[580px]">
          {/* Language Tabs & Sample Prompts Bar */}
          <div className="p-3 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2 bg-slate-50/50 rounded-t-2xl">
            <div className="flex items-center gap-1">
              <Globe className="w-3.5 h-3.5 text-slate-400 mr-1" />
              <button
                onClick={() => setSelectedLanguage('en')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                  selectedLanguage === 'en'
                    ? 'bg-white text-brand-700 shadow-xs border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                English
              </button>
              <button
                onClick={() => setSelectedLanguage('hi')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                  selectedLanguage === 'hi'
                    ? 'bg-white text-brand-700 shadow-xs border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                हिंदी (Hindi)
              </button>
              <button
                onClick={() => setSelectedLanguage('hinglish')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                  selectedLanguage === 'hinglish'
                    ? 'bg-white text-brand-700 shadow-xs border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Hinglish
              </button>
            </div>

            <div className="text-[11px] text-slate-400 font-medium">
              India Helpline: <strong className="text-emergency-600">112</strong>
            </div>
          </div>

          {/* Messages Scroll Area */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
            {isLoadingHistory ? (
              <div className="h-full flex flex-col items-center justify-center space-y-2 text-slate-400">
                <RefreshCw className="w-6 h-6 animate-spin text-brand-600" />
                <p className="text-xs">Loading consultation history...</p>
              </div>
            ) : messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-4 space-y-4 text-slate-400">
                <Bot className="w-10 h-10 text-brand-300" />
                <div className="max-w-md space-y-1">
                  <p className="text-sm font-semibold text-slate-700">How can HealthSync assist you today?</p>
                  <p className="text-xs text-slate-500">
                    Ask about symptoms, dietary management, understanding medical terms, or preparing questions for your physician.
                  </p>
                </div>

                {/* Quick Clinical Prompts */}
                <div className="w-full max-w-xl text-left space-y-2 pt-2">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Suggested Clinical Scenarios:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {samplePrompts.map((p, idx) => (
                      <button
                        key={idx}
                        disabled={isSending}
                        onClick={() => {
                          setSelectedLanguage(p.lang as any);
                          handleSend(p.text);
                        }}
                        className={`p-2.5 rounded-xl border text-left hover:shadow-xs transition-all ${p.color}`}
                      >
                        <div className="text-[11px] font-bold truncate">{p.title}</div>
                        <div className="text-[10px] text-slate-600 line-clamp-1">{p.text}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}

            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex flex-col ${msg.sender === 'USER' ? 'items-end' : 'items-start'} space-y-1`}
              >
                {/* Emergency Banner Header for Assistant message */}
                {msg.isRedFlagWarning && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-t-lg bg-emergency-600 text-white text-xs font-bold w-full max-w-2xl animate-pulse">
                    <PhoneCall className="w-4 h-4 shrink-0" />
                    <span>POTENTIAL MEDICAL EMERGENCY DETECTED • DIAL 112 (INDIA)</span>
                  </div>
                )}

                <div
                  className={`p-4 rounded-2xl max-w-2xl text-xs sm:text-sm leading-relaxed ${
                    msg.sender === 'USER'
                      ? 'bg-brand-600 text-white rounded-br-none shadow-xs'
                      : msg.isRedFlagWarning
                      ? 'bg-emergency-50 border border-emergency-300 text-slate-900 rounded-tl-none'
                      : 'bg-slate-50 border border-slate-200 text-slate-800 rounded-tl-none'
                  }`}
                >
                  <div className="whitespace-pre-line">{msg.content}</div>

                  {msg.disclaimer && (
                    <div className="mt-3 pt-2 border-t border-slate-200/60 text-[10px] text-slate-400 italic">
                      {msg.disclaimer}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* In-Flight Sending Indicator */}
            {isSending && (
              <div className="flex items-center gap-2 text-xs text-slate-400 italic p-2 bg-slate-50 rounded-xl w-fit">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-brand-600" />
                <span>Evaluating clinical symptoms and assessing triage urgency...</span>
              </div>
            )}

            {/* Structured Error & Retry Banner */}
            {errorMessage && (
              <div className="p-4 rounded-xl border border-red-200 bg-red-50 text-red-900 text-xs space-y-2 max-w-2xl">
                <div className="flex items-center gap-2 font-bold">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{errorMessage.title}</span>
                </div>
                <p className="text-red-700">{errorMessage.details}</p>

                {errorMessage.instructions && errorMessage.instructions.length > 0 && (
                  <ul className="list-disc pl-5 space-y-1 text-[11px] text-red-600">
                    {errorMessage.instructions.map((inst, i) => (
                      <li key={i}>{inst}</li>
                    ))}
                  </ul>
                )}

                {lastFailedDraft && (
                  <div className="pt-2 flex items-center gap-2">
                    <button
                      onClick={() => handleSend(lastFailedDraft)}
                      className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Retry Message</span>
                    </button>
                    <span className="text-[11px] text-red-600">Your draft has been preserved in the input box.</span>
                  </div>
                )}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Bar */}
          <div className="p-3 border-t border-slate-200 bg-slate-50/50 rounded-b-2xl">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                placeholder={
                  selectedLanguage === 'hi'
                    ? 'अपने लक्षण बताएं या कोई स्वास्थ्य प्रश्न पूछें...'
                    : selectedLanguage === 'hinglish'
                    ? 'Apne symptoms batayein ya health question puchein...'
                    : 'Describe your symptoms or ask a health question in English or Hindi...'
                }
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                disabled={isSending}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none bg-white disabled:bg-slate-100"
              />
              <button
                type="submit"
                disabled={isSending || !inputValue.trim()}
                className="px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-xs sm:text-sm font-bold shadow-xs flex items-center gap-1.5 transition-colors"
              >
                {isSending ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                <span className="hidden sm:inline">Send</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
