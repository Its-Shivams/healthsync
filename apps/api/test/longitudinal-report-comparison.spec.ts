import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { AIService } from '../src/ai/ai.service';
import { TriageEngineService } from '../src/ai/triage-engine.service';
import { UserRole } from '@healthsync/shared-types';

describe('HealthSync Longitudinal Medical Report Retrieval & Comparison', () => {
  let mockPrisma: any;
  let triageEngine: TriageEngineService;
  let mockOllamaProvider: any;
  let mockGeminiProvider: any;
  let mockDemoProvider: any;
  let aiService: AIService;

  const patientAarav = {
    id: 'user-aarav-uuid',
    role: UserRole.PATIENT,
    patientProfileId: 'patient-aarav-profile-uuid',
    email: 'patient.aarav@healthsync.mock',
    firstName: 'Aarav',
    lastName: 'Sharma',
  };

  const patientBob = {
    id: 'user-bob-uuid',
    role: UserRole.PATIENT,
    patientProfileId: 'patient-bob-profile-uuid',
    email: 'patient.bob@healthsync.mock',
    firstName: 'Bob',
    lastName: 'Verma',
  };

  const syntheticReportsAarav = [
    {
      id: 'report-sep-2025-uuid',
      documentId: 'doc-sep-2025-uuid',
      testName: 'Complete Comprehensive Metabolic & Lipid Panel',
      testDate: new Date('2025-09-10'),
      laboratoryName: 'Apex Central Pathology & Diagnostic Lab',
      metricsJson: JSON.stringify([
        { name: 'Total Cholesterol', value: '194', numericValue: 194, unit: 'mg/dL', referenceRange: '< 200', isAbnormal: false },
        { name: 'HDL Cholesterol', value: '48', numericValue: 48, unit: 'mg/dL', referenceRange: '> 40', isAbnormal: false },
        { name: 'LDL Cholesterol', value: '118', numericValue: 118, unit: 'mg/dL', referenceRange: '< 100', isAbnormal: true },
        { name: 'Triglycerides', value: '140', numericValue: 140, unit: 'mg/dL', referenceRange: '< 150', isAbnormal: false },
        { name: 'Fasting Blood Glucose', value: '92', numericValue: 92, unit: 'mg/dL', referenceRange: '70 - 99', isAbnormal: false },
        { name: 'HbA1c', value: '5.6', numericValue: 5.6, unit: '%', referenceRange: '< 5.7', isAbnormal: false },
      ]),
      doctorReview: 'Borderline elevated LDL. Recommended dietary moderation and low-dose Statin.',
      isVerified: true,
      document: {
        id: 'doc-sep-2025-uuid',
        patientId: 'patient-aarav-profile-uuid',
        title: 'Complete Comprehensive Metabolic & Lipid Panel',
        category: 'LAB_REPORT',
        fileName: 'aarav_sharma_lipid_panel_2025_09.pdf',
        createdAt: new Date('2025-09-10'),
      },
    },
    {
      id: 'report-mar-2025-uuid',
      documentId: 'doc-mar-2025-uuid',
      testName: 'Baseline Comprehensive Metabolic & Lipid Panel',
      testDate: new Date('2025-03-15'),
      laboratoryName: 'Apex Central Pathology & Diagnostic Lab',
      metricsJson: JSON.stringify([
        { name: 'Total Cholesterol', value: '224', numericValue: 224, unit: 'mg/dL', referenceRange: '< 200', isAbnormal: true },
        { name: 'HDL Cholesterol', value: '42', numericValue: 42, unit: 'mg/dL', referenceRange: '> 40', isAbnormal: false },
        { name: 'LDL Cholesterol', value: '148', numericValue: 148, unit: 'mg/dL', referenceRange: '< 100', isAbnormal: true },
        { name: 'Triglycerides', value: '170', numericValue: 170, unit: 'mg/dL', referenceRange: '< 150', isAbnormal: true },
        { name: 'Fasting Blood Glucose', value: '102', numericValue: 102, unit: 'mg/dL', referenceRange: '70 - 99', isAbnormal: true },
        { name: 'HbA1c', value: '6.1', numericValue: 6.1, unit: '%', referenceRange: '< 5.7', isAbnormal: true },
      ]),
      doctorReview: 'Elevated lipid markers and borderline glycemic levels.',
      isVerified: true,
      document: {
        id: 'doc-mar-2025-uuid',
        patientId: 'patient-aarav-profile-uuid',
        title: 'Baseline Comprehensive Metabolic & Lipid Panel',
        category: 'LAB_REPORT',
        fileName: 'aarav_sharma_lipid_panel_2025_03.pdf',
        createdAt: new Date('2025-03-15'),
      },
    },
  ];

  beforeEach(() => {
    mockPrisma = {
      aIConversation: {
        findUnique: jest.fn(),
        create: jest.fn().mockImplementation((args) => Promise.resolve({ id: 'conv-new-1', ...args.data })),
      },
      aIMessage: {
        create: jest.fn().mockImplementation((args) => Promise.resolve({ id: 'msg-id-1', ...args.data })),
        findMany: jest.fn().mockResolvedValue([]),
      },
      patientProfile: {
        findUnique: jest.fn().mockImplementation(({ where }) => {
          if (where.id === patientAarav.patientProfileId) {
            return Promise.resolve({
              id: patientAarav.patientProfileId,
              allergies: [{ allergen: 'Sulfa Drugs', severity: 'MILD' }],
              conditions: [{ name: 'Hypertension' }],
            });
          }
          if (where.id === patientBob.patientProfileId) {
            return Promise.resolve({
              id: patientBob.patientProfileId,
              allergies: [],
              conditions: [{ name: 'Asthma' }],
            });
          }
          return Promise.resolve(null);
        }),
      },
      medicalReport: {
        findMany: jest.fn().mockImplementation(({ where }) => {
          if (where?.document?.patientId === patientAarav.patientProfileId) {
            return Promise.resolve(syntheticReportsAarav);
          }
          // Bob has NO reports
          return Promise.resolve([]);
        }),
      },
    };

    triageEngine = new TriageEngineService();

    mockOllamaProvider = {
      name: 'Ollama (Local LLM)',
      isAvailable: jest.fn().mockResolvedValue(true),
      generateResponse: jest.fn(),
    };

    mockGeminiProvider = {
      name: 'Google Gemini (Cloud AI)',
      isAvailable: jest.fn().mockResolvedValue(true),
      generateResponse: jest.fn().mockResolvedValue({
        content: `Based on your stored records:
1. Total Cholesterol: Decreased from 224 mg/dL (2025-03-15) to 194 mg/dL (2025-09-10).
2. LDL Cholesterol: Improved from 148 mg/dL to 118 mg/dL.
3. Fasting Blood Glucose: Decreased from 102 mg/dL to 92 mg/dL.
4. HbA1c: Improved from 6.1% to 5.6%.

### Reports Reviewed
- Complete Comprehensive Metabolic & Lipid Panel (2025-09-10)
- Baseline Comprehensive Metabolic & Lipid Panel (2025-03-15)`,
        provider: 'gemini',
        model: 'gemini-flash-latest',
        responseTimeMs: 310,
      }),
    };

    mockDemoProvider = {
      name: 'Clinical Demo Adapter',
      isAvailable: jest.fn().mockResolvedValue(true),
      generateResponse: jest.fn(),
    };

    aiService = new AIService(
      mockPrisma,
      triageEngine,
      mockOllamaProvider,
      mockGeminiProvider,
      mockDemoProvider,
    );

    process.env.AI_PROVIDER = 'gemini';
  });

  describe('1. Longitudinal Medical Report Retrieval & Context Injection', () => {
    it('should retrieve only the authenticated patient reports and pass them into Gemini systemPrompt', async () => {
      const response = await aiService.handleChatMessage(patientAarav, {
        message: 'Compare my last two reports and summarize my cholesterol trends.',
      });

      // Verify Prisma queried reports strictly with patientId
      expect(mockPrisma.medicalReport.findMany).toHaveBeenCalledWith({
        where: {
          document: {
            patientId: patientAarav.patientProfileId,
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
      });

      // Verify Gemini provider received systemPrompt containing the reports, exact dates, and metrics
      expect(mockGeminiProvider.generateResponse).toHaveBeenCalled();
      const [, systemPrompt] = mockGeminiProvider.generateResponse.mock.calls[0];

      expect(systemPrompt).toContain('PATIENT AUTHORIZED LABORATORY & DIAGNOSTIC REPORTS');
      expect(systemPrompt).toContain('Complete Comprehensive Metabolic & Lipid Panel');
      expect(systemPrompt).toContain('Baseline Comprehensive Metabolic & Lipid Panel');
      expect(systemPrompt).toContain('Total Cholesterol: 224 mg/dL');
      expect(systemPrompt).toContain('Total Cholesterol: 194 mg/dL');
      expect(systemPrompt).toContain('2025-03-15');
      expect(systemPrompt).toContain('2025-09-10');
      expect(systemPrompt).toContain('MEDICAL REPORT ANALYSIS & LONGITUDINAL COMPARISON');

      // Verify metadata returned to client
      expect(response.reportsReviewed).toHaveLength(2);
      expect(response.reportsReviewed[0].testDate).toBe('2025-09-10');
      expect(response.reportsReviewed[1].testDate).toBe('2025-03-15');
    });

    it('should strictly enforce cross-patient isolation so Patient Bob never receives Patient Aarav reports', async () => {
      const response = await aiService.handleChatMessage(patientBob, {
        message: 'Compare my last two reports.',
      });

      // Verify Prisma queried with Bob's ID, not Aarav's
      expect(mockPrisma.medicalReport.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            document: {
              patientId: patientBob.patientProfileId,
            },
          },
        }),
      );

      // Verify Gemini systemPrompt did NOT contain Aarav's report titles or test numbers
      const [, systemPrompt] = mockGeminiProvider.generateResponse.mock.calls[0];
      expect(systemPrompt).not.toContain('Aarav');
      expect(systemPrompt).not.toContain('(Source Records):');
      expect(systemPrompt).not.toContain('224 mg/dL');
      expect(systemPrompt).not.toContain('Complete Comprehensive Metabolic');
      expect(response.reportsReviewed).toHaveLength(0);
    });
  });

  describe('2. Source Grounding & Uncertainty Guidance in System Prompt', () => {
    it('instructs Gemini to never invent missing values and to clearly explain omitted tests', async () => {
      await aiService.handleChatMessage(patientAarav, {
        message: 'Did my uric acid levels change between reports?',
      });

      const [, systemPrompt] = mockGeminiProvider.generateResponse.mock.calls[0];

      expect(systemPrompt).toContain('Never invent, assume, or hallucinate test values');
      expect(systemPrompt).toContain('If a test appears in one report but was NOT measured in another, state clearly that it was not tested');
      expect(systemPrompt).toContain('### Reports Reviewed');
    });
  });

  describe('3. Conversation Ownership & Message Validation', () => {
    it('rejects cross-patient conversation access with ForbiddenException (403)', async () => {
      mockPrisma.aIConversation.findUnique.mockResolvedValue({
        id: 'conv-aarav-only',
        userId: patientAarav.id,
      });

      await expect(
        aiService.handleChatMessage(patientBob, {
          message: 'Can you summarize these reports?',
          conversationId: 'conv-aarav-only',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rejects empty or whitespace-only messages with BadRequestException (400)', async () => {
      await expect(
        aiService.handleChatMessage(patientAarav, { message: '   ' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects messages longer than 2000 characters with BadRequestException (400)', async () => {
      const longMessage = 'A'.repeat(2001);
      await expect(
        aiService.handleChatMessage(patientAarav, { message: longMessage }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
