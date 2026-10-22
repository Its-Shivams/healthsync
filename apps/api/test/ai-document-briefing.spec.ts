import { AIService } from '../src/ai/ai.service';
import { DemoClinicalProvider } from '../src/ai/demo.provider';
import { GeminiProvider } from '../src/ai/gemini.provider';
import { TriageEngineService } from '../src/ai/triage-engine.service';
import { BadRequestException } from '@nestjs/common';
import { UserRole } from '@healthsync/shared-types';

describe('AI Multimodal Prescription & Medical Report Briefing', () => {
  let mockPrisma: any;
  let triageEngine: TriageEngineService;
  let demoProvider: DemoClinicalProvider;
  let geminiProvider: GeminiProvider;
  let aiService: AIService;

  const mockPatientUser = {
    id: 'user-patient-1',
    role: UserRole.PATIENT,
    patientProfileId: 'patient-profile-1',
  };

  beforeEach(() => {
    mockPrisma = {
      aIConversation: {
        findUnique: jest.fn(),
        create: jest.fn().mockResolvedValue({ id: 'conv-doc-1' }),
      },
      aIMessage: {
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'msg-' + Math.random(), ...data })),
      },
      patientProfile: {
        findUnique: jest.fn().mockResolvedValue({
          allergies: [{ allergen: 'Sulfa', severity: 'Mild' }],
          conditions: [{ name: 'Hypertension' }],
        }),
      },
      medicalReport: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };

    triageEngine = new TriageEngineService();
    demoProvider = new DemoClinicalProvider();
    geminiProvider = new GeminiProvider();

    const mockOllama = {
      name: 'Ollama (Local LLM)',
      isAvailable: jest.fn().mockResolvedValue(true),
      generateResponse: jest.fn(),
    };

    aiService = new AIService(
      mockPrisma as any,
      triageEngine,
      mockOllama as any,
      geminiProvider,
      demoProvider,
    );

    // Default to demo provider for deterministic tests
    process.env.AI_PROVIDER = 'demo';
  });

  it('should generate a structured clinical briefing when a prescription PDF is uploaded', async () => {
    const fakePdfBase64 = Buffer.from('Fake PDF Binary Data').toString('base64');

    const result = await aiService.handleChatMessage(mockPatientUser, {
      message: 'Please explain what medications are prescribed here.',
      attachmentBase64: fakePdfBase64,
      attachmentMimeType: 'application/pdf',
      attachmentFileName: 'prescription_dr_kapoor.pdf',
    });

    expect(result.conversationId).toBe('conv-doc-1');
    expect(result.message).toBeDefined();

    // Check user message was saved with attachment metadata
    expect(mockPrisma.aIMessage.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          sender: 'USER',
          content: expect.stringContaining('prescription_dr_kapoor.pdf'),
        }),
      }),
    );

    // Check assistant response contains structured briefing sections
    const content = result.message.content;
    expect(content).toContain('Medical Document Analysis');
    expect(content).toContain('Key Medications & Findings Detected');
    expect(content).toContain('Plain-Language Patient Summary');
    expect(content).toContain('Precautions');
  });

  it('should auto-apply default briefing prompt when an image is attached without user text', async () => {
    const fakeImageBase64 = Buffer.from('Fake PNG Image Data').toString('base64');

    const result = await aiService.handleChatMessage(mockPatientUser, {
      attachmentBase64: fakeImageBase64,
      attachmentMimeType: 'image/png',
      attachmentFileName: 'lab_report_scan.png',
    });

    expect(result.message).toBeDefined();
    expect(result.message.content).toContain('lab_report_scan.png');
    expect(result.message.content).toContain('Clinical Prescription / Laboratory Report');
  });

  it('should reject request when neither text message nor document attachment is provided', async () => {
    await expect(
      aiService.handleChatMessage(mockPatientUser, {
        message: '',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('should verify DemoClinicalProvider outputs formatted medical brief for attachments', async () => {
    const response = await demoProvider.generateResponse(
      'Analyze document',
      'System prompt',
      [],
      {
        base64: 'fake-data',
        mimeType: 'application/pdf',
        fileName: 'lipid_profile_2026.pdf',
      },
    );

    expect(response.content).toContain('lipid_profile_2026.pdf');
    expect(response.content).toContain('Amlodipine');
    expect(response.content).toContain('Metformin');
    expect(response.content).toContain('Atorvastatin');
    expect(response.content).toContain('Plain-Language Patient Summary');
  });
});
