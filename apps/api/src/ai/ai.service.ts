import { Injectable, Logger, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TriageEngineService } from './triage-engine.service';
import { OllamaProvider } from './ollama.provider';
import { GeminiProvider } from './gemini.provider';
import { DemoClinicalProvider } from './demo.provider';
import { IAIProvider, AIMessageHistory } from './ai-provider.interface';
import { TriageUrgency, UserRole } from '@healthsync/shared-types';
import { AIChatDto } from './dto/ai-chat.dto';


@Injectable()
export class AIService {
  private readonly logger = new Logger(AIService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly triageEngine: TriageEngineService,
    private readonly ollamaProvider: OllamaProvider,
    private readonly geminiProvider: GeminiProvider,
    private readonly demoProvider: DemoClinicalProvider,
  ) {}

  getActiveProvider(): IAIProvider {
    const providerName = (process.env.AI_PROVIDER || 'gemini').toLowerCase();
    if (providerName === 'ollama') {
      return this.ollamaProvider;
    }
    if (providerName === 'demo' || providerName === 'demo_adapter') {
      return this.demoProvider;
    }
    return this.geminiProvider;
  }

  async getStatus() {
    const provider = this.getActiveProvider();
    const isAvailable = await provider.isAvailable();
    const configuredProvider = (process.env.AI_PROVIDER || 'gemini').toLowerCase();
    const model = configuredProvider === 'ollama'
      ? (process.env.OLLAMA_MODEL || 'llama3.2')
      : (process.env.GEMINI_MODEL || 'gemini-flash-latest');

    return {
      activeProvider: provider.name,
      configuredProviderName: configuredProvider,
      model,
      isAvailable,
      emergencyHelpline: process.env.EMERGENCY_HELPLINE || '112',
      languagesSupported: ['English', 'Hindi', 'Hinglish'],
    };
  }

  async handleChatMessage(user: any, input: AIChatDto) {
    // 0. Strict input validation & sanitization
    const hasAttachment = Boolean(input?.attachmentBase64 && input?.attachmentMimeType);

    if (!input || (!input.message && !hasAttachment)) {
      if (typeof input?.message === 'string' && input.message.trim().length === 0) {
        throw new BadRequestException('Message cannot be empty or whitespace-only');
      }
      throw new BadRequestException('Message is required and must be a string');
    }

    if (input.message !== undefined && typeof input.message !== 'string') {
      throw new BadRequestException('Message is required and must be a string');
    }

    let sanitizedMessage = typeof input.message === 'string' ? input.message.trim() : '';

    if (!sanitizedMessage) {
      if (hasAttachment) {
        sanitizedMessage = 'Please analyze this attached medical document (prescription or diagnostic report). Break down the document type, key medications/parameters, plain-language patient explanation, precautions, and recommended questions for my doctor.';
      } else {
        throw new BadRequestException('Message cannot be empty or whitespace-only');
      }
    }

    if (sanitizedMessage.length > 2000) {
      throw new BadRequestException('Message length cannot exceed 2000 characters');
    }

    const attachment = hasAttachment
      ? {
          base64: input.attachmentBase64!,
          mimeType: input.attachmentMimeType!,
          fileName: input.attachmentFileName || 'Medical Document',
        }
      : undefined;

    // 1. CONVERSATION OWNERSHIP AUTHORIZATION
    let conversationId = input.conversationId;
    if (conversationId) {
      const existingConv = await this.prisma.aIConversation.findUnique({
        where: { id: conversationId },
      });
      if (!existingConv) {
        throw new NotFoundException('Conversation not found');
      }
      if (existingConv.userId !== user.id) {
        throw new ForbiddenException('You do not have permission to access this conversation');
      }
    } else {
      const titleSource = attachment?.fileName ? `Doc: ${attachment.fileName}` : sanitizedMessage;
      const conv = await this.prisma.aIConversation.create({
        data: {
          userId: user.id,
          title: titleSource.length > 40 ? titleSource.substring(0, 37) + '...' : titleSource,
        },
      });
      conversationId = conv.id;
    }

    // 2. DETERMINISTIC RED-FLAG TRIAGE LAYER (Evaluated BEFORE any LLM call)
    const triage = this.triageEngine.evaluate(sanitizedMessage);

    // Immediate emergency short-circuit (Deterministic 112 routing)
    if (triage.isEmergency) {
      const emergencyContent = `🚨 **POTENTIAL MEDICAL EMERGENCY DETECTED**\n\n` +
        `**Immediate Action Required:**\n` +
        `- Dial emergency services (**${triage.emergencyNumber}** in India) immediately or proceed to the nearest emergency trauma center.\n` +
        `- Do not wait for appointment scheduling or further chatbot questions.\n\n` +
        `**High-Risk Warning Signs Identified:**\n` +
        triage.matchedRedFlags.map((rf) => `• ${rf}`).join('\n') +
        `\n\n*${triage.disclaimer}*`;

      await this.prisma.aIMessage.create({
        data: {
          conversationId,
          sender: 'USER',
          content: sanitizedMessage,
        },
      });

      const assistantMsg = await this.prisma.aIMessage.create({
        data: {
          conversationId,
          sender: 'ASSISTANT',
          content: emergencyContent,
          triageUrgency: TriageUrgency.POSSIBLE_EMERGENCY,
          isRedFlagWarning: true,
          emergencyDirectives: JSON.stringify(triage.matchedRedFlags),
          disclaimer: triage.disclaimer,
        },
      });

      return {
        conversationId,
        message: assistantMsg,
        triage,
        isEmergencyAlert: true,
      };
    }

    // 3. MEDICATION MODIFICATION GUARDRAIL SHORT-CIRCUIT
    if ((triage.urgency === TriageUrgency.MEDICAL_EVALUATION && sanitizedMessage.toLowerCase().includes('stop')) || sanitizedMessage.toLowerCase().includes('dose')) {
      const medSafetyContent = `⚠️ **PRESCRIPTION MEDICATION SAFETY NOTICE**\n\n` +
        `${triage.recommendedAction}\n\n` +
        `HealthSync Assistant is an informational care-navigation assistant and cannot prescribe, modify doses, or discontinue medications. ` +
        `Please consult your prescribing doctor through our Doctor Portal or visit your clinic.`;

      await this.prisma.aIMessage.create({
        data: {
          conversationId,
          sender: 'USER',
          content: sanitizedMessage,
        },
      });

      const assistantMsg = await this.prisma.aIMessage.create({
        data: {
          conversationId,
          sender: 'ASSISTANT',
          content: medSafetyContent,
          triageUrgency: TriageUrgency.MEDICAL_EVALUATION,
          isRedFlagWarning: false,
          disclaimer: triage.disclaimer,
        },
      });

      return {
        conversationId,
        message: assistantMsg,
        triage,
        isEmergencyAlert: false,
      };
    }

    // 4. RETRIEVE AUTHORIZED, ANONYMIZED PATIENT CLINICAL CONTEXT & MEDICAL REPORTS
    let clinicalContext = '';
    const reportsReviewed: Array<{ id: string; title: string; testDate: string; testName: string }> = [];

    if (user.role === UserRole.PATIENT && user.patientProfileId) {
      const profile = await this.prisma.patientProfile.findUnique({
        where: { id: user.patientProfileId },
        include: {
          allergies: true,
          conditions: true,
        },
      });

      if (profile) {
        const allergiesStr = profile.allergies.map((a) => `${a.allergen} (${a.severity})`).join(', ') || 'None recorded';
        const conditionsStr = profile.conditions.map((c) => c.name).join(', ') || 'None recorded';
        clinicalContext = `PATIENT CONTEXT (Anonymized):\n- Known Allergies: ${allergiesStr}\n- Chronic Conditions: ${conditionsStr}\n`;
      }

      // Strictly retrieve only this authorized patient's verified medical reports
      const reports = this.prisma.medicalReport
        ? await this.prisma.medicalReport.findMany({
            where: {
              document: {
                patientId: user.patientProfileId,
              },
            },
            include: {
              document: {
                select: {
                  id: true,
                  title: true,
                  category: true,
                  fileName: true,
                  createdAt: true,
                },
              },
            },
            orderBy: { testDate: 'desc' },
            take: 5,
          })
        : [];

      if (reports && reports.length > 0) {
        clinicalContext += `\nPATIENT AUTHORIZED LABORATORY & DIAGNOSTIC REPORTS (Source Records):\n`;
        for (const r of reports) {
          const dateStr = r.testDate ? r.testDate.toISOString().split('T')[0] : 'Unknown Date';
          reportsReviewed.push({
            id: r.documentId,
            title: r.document?.title || r.testName,
            testDate: dateStr,
            testName: r.testName,
          });

          clinicalContext += `\n[Report: "${r.document?.title || r.testName}" | Date: ${dateStr} | Lab: ${r.laboratoryName || 'Diagnostic Laboratory'}]\n`;
          try {
            const metrics = JSON.parse(r.metricsJson);
            if (Array.isArray(metrics) && metrics.length > 0) {
              clinicalContext += `Metrics Measured:\n`;
              for (const m of metrics) {
                const abnormalTag = m.isAbnormal ? ' [Flag: Out-of-range]' : ' [Flag: Normal]';
                const refTag = m.referenceRange ? ` (Reference Range: ${m.referenceRange})` : '';
                clinicalContext += `  - ${m.name}: ${m.value} ${m.unit || ''}${refTag}${abnormalTag}\n`;
              }
            }
          } catch {
            clinicalContext += `Summary: ${r.metricsJson}\n`;
          }
          if (r.doctorReview) {
            clinicalContext += `Physician Assessment Note: ${r.doctorReview}\n`;
          }
        }
      }
    }

    // 5. COMPOSE STRICT CLINICAL SYSTEM PROMPT
    const systemPrompt = `You are HealthSync Assistant, an AI clinical education and care-navigation assistant.

CRITICAL OPERATIONAL RULES:
1. Provide safe, empathetic, and clear healthcare information.
2. NEVER diagnose disease definitively from symptoms alone. Express uncertainty clearly.
3. NEVER prescribe medications or suggest altering prescription drug dosages.
4. Support English, Hindi, and Hinglish naturally based on the language used by the user.
5. Emphasize when clinical physical evaluation by a physician is necessary.
6. The user is in India. Use local context (e.g. emergency helpline 112) when relevant.
7. Always conclude with a brief note that this is educational advice, not a doctor's consultation.
8. MEDICAL REPORT ANALYSIS & LONGITUDINAL COMPARISON:
   - When the user asks to inspect, summarize, or compare their medical reports (e.g., "Compare my last two reports"):
     a) Use ONLY the actual metrics, dates, and units listed under "PATIENT AUTHORIZED LABORATORY & DIAGNOSTIC REPORTS".
     b) Never invent, assume, or hallucinate test values, dates, or units not explicitly provided.
     c) For longitudinal comparison, clearly identify the two specific reports being compared by Title and Test Date.
     d) Compare each parameter present in both reports: cite the baseline date and value with units, follow-up date and value with units, and direction/amount of change (e.g., "Total Cholesterol: Decreased from 220 mg/dL on 2025-01-10 to 180 mg/dL on 2025-07-10 (improvement of 40 mg/dL)").
     e) If a test appears in one report but was NOT measured in another, state clearly that it was not tested in that report rather than inventing a number.
     f) Conclude every comparison with a dedicated "### Reports Reviewed" section listing each report's exact Title and Test Date.
   - If fewer than two reports are provided in the records when a comparison is requested, explain clearly that at least two reports are required for a comparison, list what is currently on file, and do not invent a second report.
9. Only reference medical records if specific patient context is provided above. Never claim to have reviewed records that were not provided.
10. PRESCRIPTION & REPORT DOCUMENT ATTACHMENT BRIEFING:
   - When the user uploads an image or PDF of a prescription or laboratory diagnostic report:
     a) Carefully inspect and transcribe all visible details: medications, dosages, lab parameters, reference ranges, and physician notes.
     b) Structure the output clearly:
        - "### 📋 Document Overview": Classification (e.g. Outpatient Prescription, Complete Blood Count, Lipid Profile).
        - "### 💊 Key Medications & Instructions" (for prescriptions): List each medication name, dosage strength, dosing schedule (e.g. 1-0-1, morning/night, with food), and clinical purpose.
        - "### 🔬 Key Findings & Observations" (for reports): List parameters, values, units, reference ranges, and whether they are normal or flagged.
        - "### 💡 Plain-Language Summary": Clear, empathetic explanation of what the doctor prescribed or what the test results indicate in everyday language.
        - "### ⚠️ Patient Precautions & Doctor Questions": Important precautions, potential side-effect warnings to discuss, and targeted questions for their next consultation.
     c) Emphasize that the patient must follow the original physical prescription and consult their physician before changing any treatment.

${clinicalContext}`;

    // 6. LOAD MESSAGE HISTORY FROM AUTHORIZED CONVERSATION
    const recentMessages = await this.prisma.aIMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
      take: 6,
    });

    const history: AIMessageHistory[] = recentMessages
      .reverse()
      .filter((m) => m.sender === 'USER' || m.sender === 'ASSISTANT')
      .map((m) => ({
        role: m.sender === 'USER' ? 'user' : 'assistant',
        content: m.content,
      }));

    // 7. CALL CONFIGURED AI PROVIDER
    const provider = this.getActiveProvider();

    // Provider throws transparent ServiceUnavailableException on failure (No silent fake fallback)
    const result = await provider.generateResponse(sanitizedMessage, systemPrompt, history, attachment);

    // Save both User message and Assistant response only upon successful generation
    const userContentToSave = attachment
      ? `[Attached Document: ${attachment.fileName} (${attachment.mimeType})]\n\n${sanitizedMessage}`
      : sanitizedMessage;

    await this.prisma.aIMessage.create({
      data: {
        conversationId,
        sender: 'USER',
        content: userContentToSave,
      },
    });

    const assistantMsg = await this.prisma.aIMessage.create({
      data: {
        conversationId,
        sender: 'ASSISTANT',
        content: result.content,
        triageUrgency: triage.urgency,
        isRedFlagWarning: false,
        disclaimer: triage.disclaimer,
      },
    });

    return {
      conversationId,
      message: assistantMsg,
      triage,
      provider: result.provider,
      model: result.model,
      responseTimeMs: result.responseTimeMs,
      reportsReviewed,
    };
  }

  async listConversations(userId: string) {
    return this.prisma.aIConversation.findMany({
      where: { userId },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async getConversation(userId: string, conversationId: string) {
    const existing = await this.prisma.aIConversation.findUnique({
      where: { id: conversationId },
    });

    if (!existing) {
      throw new NotFoundException('Conversation not found');
    }

    if (existing.userId !== userId) {
      throw new ForbiddenException('You do not have permission to access this conversation');
    }

    return this.prisma.aIConversation.findUnique({
      where: { id: conversationId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  }
}
