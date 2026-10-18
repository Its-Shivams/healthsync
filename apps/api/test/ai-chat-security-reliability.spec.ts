import { BadRequestException, ForbiddenException, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { AIService } from '../src/ai/ai.service';
import { TriageEngineService } from '../src/ai/triage-engine.service';
import { UserRole, TriageUrgency } from '@healthsync/shared-types';

describe('HealthSync AI Chat Security, Ownership Authorization & Reliability (Phase 1)', () => {
  let mockPrisma: any;
  let triageEngine: TriageEngineService;
  let mockOllamaProvider: any;
  let mockGeminiProvider: any;
  let mockDemoProvider: any;
  let aiService: AIService;

  const userA = {
    id: 'user-patient-a-uuid',
    role: UserRole.PATIENT,
    patientProfileId: 'profile-a-uuid',
    email: 'patient.a@healthsync.mock',
  };

  const userB = {
    id: 'user-patient-b-uuid',
    role: UserRole.PATIENT,
    patientProfileId: 'profile-b-uuid',
    email: 'patient.b@healthsync.mock',
  };

  beforeEach(() => {
    mockPrisma = {
      aIConversation: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
      },
      aIMessage: {
        create: jest.fn().mockImplementation((args) => Promise.resolve({ id: 'msg-id-1', ...args.data })),
        createMany: jest.fn().mockResolvedValue({ count: 2 }),
        findMany: jest.fn().mockResolvedValue([]),
      },
      patientProfile: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'profile-a-uuid',
          allergies: [{ allergen: 'Penicillin', severity: 'HIGH' }],
          conditions: [{ name: 'Hypertension' }],
        }),
      },
      medicalReport: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };

    triageEngine = new TriageEngineService();

    mockOllamaProvider = {
      name: 'Ollama (Local LLM)',
      isAvailable: jest.fn().mockResolvedValue(true),
      generateResponse: jest.fn().mockResolvedValue({
        content: 'This is a genuine response from local LLM.',
        provider: 'ollama',
        model: 'llama3.2',
        responseTimeMs: 350,
      }),
    };

    mockGeminiProvider = {
      name: 'Google Gemini (Cloud AI)',
      isAvailable: jest.fn().mockResolvedValue(true),
      generateResponse: jest.fn().mockResolvedValue({
        content: 'This is a genuine response from Gemini cloud model.',
        provider: 'gemini',
        model: 'gemini-1.5-flash',
        responseTimeMs: 220,
      }),
    };

    mockDemoProvider = {
      name: 'Clinical Demo Adapter',
      isAvailable: jest.fn().mockResolvedValue(true),
      generateResponse: jest.fn().mockResolvedValue({
        content: 'Hardcoded canned response that should NEVER be called on provider failure.',
        provider: 'demo_adapter',
        model: 'clinical-rules-v1',
        responseTimeMs: 10,
      }),
    };

    aiService = new AIService(
      mockPrisma as any,
      triageEngine,
      mockOllamaProvider,
      mockGeminiProvider,
      mockDemoProvider,
    );
  });

  describe('1. Input Validation and Sanitization (HTTP 400)', () => {
    it('should reject missing payload or undefined message with BadRequestException', async () => {
      await expect(aiService.handleChatMessage(userA, {} as any)).rejects.toThrow(BadRequestException);
      await expect(aiService.handleChatMessage(userA, { message: undefined as any })).rejects.toThrow(BadRequestException);
    });

    it('should reject non-string message with BadRequestException', async () => {
      await expect(aiService.handleChatMessage(userA, { message: 12345 as any })).rejects.toThrow(BadRequestException);
      await expect(aiService.handleChatMessage(userA, { message: { text: 'hello' } as any })).rejects.toThrow(BadRequestException);
    });

    it('should reject empty or whitespace-only messages with BadRequestException', async () => {
      await expect(aiService.handleChatMessage(userA, { message: '' })).rejects.toThrow(BadRequestException);
      await expect(aiService.handleChatMessage(userA, { message: '   ' })).rejects.toThrow(BadRequestException);
      await expect(aiService.handleChatMessage(userA, { message: '\n\t   \n' })).rejects.toThrow(BadRequestException);
    });

    it('should reject messages exceeding 2000 characters with BadRequestException', async () => {
      const longMessage = 'a'.repeat(2001);
      await expect(aiService.handleChatMessage(userA, { message: longMessage })).rejects.toThrow(BadRequestException);
    });
  });

  describe('2. Conversation Ownership Authorization (HTTP 403 / 404)', () => {
    it('should reject User B when attempting to send a message into User A conversation with ForbiddenException', async () => {
      // Conversation belongs to User A
      mockPrisma.aIConversation.findUnique.mockResolvedValue({
        id: 'conv-user-a',
        userId: userA.id,
        title: 'User A Consultation',
      });

      // User B attempts to access it
      await expect(
        aiService.handleChatMessage(userB, {
          message: 'Can I access this conversation?',
          conversationId: 'conv-user-a',
        }),
      ).rejects.toThrow(ForbiddenException);

      // Verify no message was appended
      expect(mockPrisma.aIMessage.create).not.toHaveBeenCalled();
    });

    it('should return NotFoundException when conversation ID does not exist', async () => {
      mockPrisma.aIConversation.findUnique.mockResolvedValue(null);

      await expect(
        aiService.handleChatMessage(userA, {
          message: 'Hello into non-existent thread',
          conversationId: 'non-existent-conv-id',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should prevent User B from reading User A conversation history via getConversation', async () => {
      mockPrisma.aIConversation.findUnique.mockResolvedValue({
        id: 'conv-user-a',
        userId: userA.id,
      });

      await expect(
        aiService.getConversation(userB.id, 'conv-user-a'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow User A to query their own conversation via getConversation', async () => {
      mockPrisma.aIConversation.findUnique.mockResolvedValue({
        id: 'conv-user-a',
        userId: userA.id,
        messages: [{ sender: 'USER', content: 'Hello' }],
      });

      const conv = await aiService.getConversation(userA.id, 'conv-user-a');
      expect(conv).toBeDefined();
      expect(conv.id).toBe('conv-user-a');
    });

    it('should create a new conversation for User A if no conversationId is provided', async () => {
      mockPrisma.aIConversation.create.mockResolvedValue({
        id: 'new-conv-a',
        userId: userA.id,
        title: 'What foods should I avoid...',
      });

      const res = await aiService.handleChatMessage(userA, {
        message: 'What foods should I avoid with high blood pressure?',
      });

      expect(res.conversationId).toBe('new-conv-a');
      expect(mockPrisma.aIConversation.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ userId: userA.id }),
      });
    });
  });

  describe('3. Transparent Provider Error Handling (No Silent Fake Canned Responses)', () => {
    it('should propagate ServiceUnavailableException when provider is unreachable, without using demo fallback', async () => {
      // Mock Gemini failing (e.g. key missing or API service down)
      mockGeminiProvider.generateResponse.mockRejectedValue(
        new ServiceUnavailableException({
          code: 'GEMINI_KEY_MISSING',
          message: 'GEMINI_API_KEY environment variable is not configured on the backend server.',
        }),
      );

      mockPrisma.aIConversation.create.mockResolvedValue({
        id: 'conv-new-1',
        userId: userA.id,
        title: 'General question',
      });

      // Must throw ServiceUnavailableException and NOT fall back to canned demo response
      await expect(
        aiService.handleChatMessage(userA, {
          message: 'What are normal fasting blood sugar ranges?',
        }),
      ).rejects.toThrow(ServiceUnavailableException);

      // Verify DemoClinicalProvider was NEVER called
      expect(mockDemoProvider.generateResponse).not.toHaveBeenCalled();

      // Verify no fake assistant message was persisted
      expect(mockPrisma.aIMessage.create).not.toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            sender: 'ASSISTANT',
            content: expect.stringContaining('Clinical Demo Adapter'),
          }),
        }),
      );
    });
  });

  describe('4. Deterministic Emergency Red-Flag Triage & 112 Directives', () => {
    it('should immediately short-circuit acute chest pain to 112 emergency without calling LLM', async () => {
      mockPrisma.aIConversation.create.mockResolvedValue({
        id: 'emergency-conv-1',
        userId: userA.id,
        title: 'Severe chest pain...',
      });

      const res = await aiService.handleChatMessage(userA, {
        message: 'I have severe crushing chest pain radiating to my arm and jaw',
      });

      expect(res.isEmergencyAlert).toBe(true);
      expect(res.triage.urgency).toBe(TriageUrgency.POSSIBLE_EMERGENCY);
      expect(res.message.content).toContain('112');
      expect(res.message.content).toContain('POTENTIAL MEDICAL EMERGENCY DETECTED');
      expect(res.message.content).not.toContain('fake');

      // Crucial: Provider was NOT called to prevent emergency care delay
      expect(mockOllamaProvider.generateResponse).not.toHaveBeenCalled();
      expect(mockGeminiProvider.generateResponse).not.toHaveBeenCalled();
      expect(mockDemoProvider.generateResponse).not.toHaveBeenCalled();
    });

    it('should trigger medication safety warning without prescribing or altering doses', async () => {
      mockPrisma.aIConversation.create.mockResolvedValue({
        id: 'med-safety-conv',
        userId: userA.id,
        title: 'Medication inquiry',
      });

      const res = await aiService.handleChatMessage(userA, {
        message: 'Should I stop taking my amlodipine blood pressure medicine?',
      });

      expect(res.isEmergencyAlert).toBe(false);
      expect(res.triage.urgency).toBe(TriageUrgency.MEDICAL_EVALUATION);
      expect(res.message.content).toContain('PRESCRIPTION MEDICATION SAFETY NOTICE');
      expect(res.message.content).toContain('cannot prescribe, modify doses, or discontinue medications');

      // Provider was NOT called
      expect(mockOllamaProvider.generateResponse).not.toHaveBeenCalled();
    });
  });

  describe('5. Real AI Provider Configuration, Availability Checks & Secret Redaction (Phase 2)', () => {
    it('should report status without performing any medical query', async () => {
      const status = await aiService.getStatus();
      expect(status.emergencyHelpline).toBe('112');
      expect(status.languagesSupported).toEqual(['English', 'Hindi', 'Hinglish']);
      expect(typeof status.isAvailable).toBe('boolean');
      expect(status.configuredProviderName).toBeDefined();
    });

    it('should redact and never log API keys in error payloads', async () => {
      const { GeminiProvider } = require('../src/ai/gemini.provider');
      const geminiProvider = new GeminiProvider();

      const originalKey = process.env.GEMINI_API_KEY;
      delete process.env.GEMINI_API_KEY;

      try {
        // Ensure that calling without key throws structured ServiceUnavailableException
        await expect(
          geminiProvider.generateResponse('test query', 'test system prompt', []),
        ).rejects.toThrow(ServiceUnavailableException);

        try {
          await geminiProvider.generateResponse('test', 'test', []);
        } catch (err: any) {
          const response = err.getResponse();
          expect(response.code).toBe('GEMINI_KEY_MISSING');
          // Verify no raw key is ever present
          expect(JSON.stringify(response)).not.toContain('AIza');
        }
      } finally {
        process.env.GEMINI_API_KEY = originalKey;
      }
    });

    it('should default to GeminiProvider as primary provider without contacting Ollama', async () => {
      delete process.env.AI_PROVIDER; // Test default fallback
      const active = aiService.getActiveProvider();
      expect(active.name).toBe('Google Gemini (Cloud AI)');
    });

    it('should not call OllamaProvider when GeminiProvider is active', async () => {
      process.env.AI_PROVIDER = 'gemini';
      mockGeminiProvider.generateResponse.mockResolvedValueOnce({
        content: 'Response directly from Google Gemini model.',
        provider: 'gemini',
        model: 'gemini-1.5-flash',
        responseTimeMs: 180,
      });

      mockPrisma.aIConversation.create.mockResolvedValueOnce({
        id: 'gemini-conv-1',
        userId: userA.id,
        title: 'Gemini health query',
      });

      const res = await aiService.handleChatMessage(userA, {
        message: 'What lifestyle modifications help manage hypertension?',
      });

      expect(res.provider).toBe('gemini');
      expect(res.message.content).toContain('Google Gemini model');
      expect(mockOllamaProvider.generateResponse).not.toHaveBeenCalled();
    });

    it('should list and restore conversations belonging to the authenticated user', async () => {
      mockPrisma.aIConversation.findMany.mockResolvedValueOnce([
        {
          id: 'conv-1',
          userId: userA.id,
          title: 'Dietary guidance',
          updatedAt: new Date(),
          messages: [{ content: 'Last message' }],
        },
      ]);

      const list = await aiService.listConversations(userA.id);
      expect(list).toHaveLength(1);
      expect(list[0].id).toBe('conv-1');
      expect(mockPrisma.aIConversation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: userA.id } }),
      );
    });
  });
});

