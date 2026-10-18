import { TriageEngineService } from '../src/ai/triage-engine.service';
import { TriageUrgency } from '@healthsync/shared-types';

describe('HealthSync AI Safety & Deterministic Triage Engine', () => {
  let triageEngine: TriageEngineService;

  beforeEach(() => {
    triageEngine = new TriageEngineService();
  });

  describe('1. Potential Life-Threatening Emergency Detection (Red-Flag Layer)', () => {
    it('should immediately flag acute chest pain with radiating pain as POSSIBLE_EMERGENCY', () => {
      const result = triageEngine.evaluate('I am having severe crushing chest pain radiating to arm');
      expect(result.urgency).toBe(TriageUrgency.POSSIBLE_EMERGENCY);
      expect(result.isEmergency).toBe(true);
      expect(result.emergencyNumber).toBe('112');
      expect(result.recommendedAction).toContain('EMERGENCY WARNING');
    });

    it('should flag stroke FAST symptoms (facial drooping, slurred speech) as POSSIBLE_EMERGENCY', () => {
      const result = triageEngine.evaluate('My father has sudden face drooping and slurred speech');
      expect(result.urgency).toBe(TriageUrgency.POSSIBLE_EMERGENCY);
      expect(result.isEmergency).toBe(true);
      expect(result.matchedRedFlags.some((rf) => rf.includes('Stroke'))).toBe(true);
    });

    it('should recognize severe respiratory distress in Hindi / Hinglish', () => {
      const result = triageEngine.evaluate('Mujhe saans lene me bohot dikkat ho rahi hai aur dum ghut raha hai');
      expect(result.urgency).toBe(TriageUrgency.POSSIBLE_EMERGENCY);
      expect(result.isEmergency).toBe(true);
    });

    it('should flag anaphylaxis and throat swelling', () => {
      const result = triageEngine.evaluate('After bee sting my throat closing and swollen tongue');
      expect(result.urgency).toBe(TriageUrgency.POSSIBLE_EMERGENCY);
      expect(result.isEmergency).toBe(true);
    });

    it('should detect psychiatric crisis and self-harm keywords with emergency helpline', () => {
      const result = triageEngine.evaluate('I feel like I want to end my life');
      expect(result.urgency).toBe(TriageUrgency.POSSIBLE_EMERGENCY);
      expect(result.isEmergency).toBe(true);
      expect(result.matchedRedFlags.some((rf) => rf.includes('Psychiatric'))).toBe(true);
    });
  });

  describe('2. Medication Safety Guardrail (No Unsupervised Prescribing/Dosage Changes)', () => {
    it('should flag questions asking to discontinue blood pressure medication', () => {
      const result = triageEngine.evaluate('Should I stop taking my blood pressure medicine since I feel fine?');
      expect(result.urgency).toBe(TriageUrgency.MEDICAL_EVALUATION);
      expect(result.isEmergency).toBe(false);
      expect(result.recommendedAction).toContain('MEDICATION SAFETY WARNING');
      expect(result.recommendedAction).toContain('Never adjust, discontinue, or double prescription medications');
    });

    it('should flag questions asking to double medication dosage', () => {
      const result = triageEngine.evaluate('Can I double my dose of metformin today?');
      expect(result.urgency).toBe(TriageUrgency.MEDICAL_EVALUATION);
      expect(result.recommendedAction).toContain('MEDICATION SAFETY WARNING');
    });
  });

  describe('3. Medical Evaluation Guidance (Non-Emergency but Clinician Needed)', () => {
    it('should classify persistent fever for 4 days as MEDICAL_EVALUATION', () => {
      const result = triageEngine.evaluate('I have had a high fever for 4 days and body chills');
      expect(result.urgency).toBe(TriageUrgency.MEDICAL_EVALUATION);
      expect(result.isEmergency).toBe(false);
      expect(result.recommendedAction).toContain('Clinical Medical Evaluation Advised');
    });

    it('should classify blood in urine as requiring medical evaluation', () => {
      const result = triageEngine.evaluate('I noticed blood in urine this morning');
      expect(result.urgency).toBe(TriageUrgency.MEDICAL_EVALUATION);
      expect(result.isEmergency).toBe(false);
    });
  });

  describe('4. Routine Care & General Wellness', () => {
    it('should classify general nutrition and lifestyle inquiries as ROUTINE_CARE', () => {
      const result = triageEngine.evaluate('What are good sources of dietary fiber for gut health?');
      expect(result.urgency).toBe(TriageUrgency.ROUTINE_CARE);
      expect(result.isEmergency).toBe(false);
      expect(result.disclaimer).toContain('HealthSync Assistant is an informational tool');
    });
  });
});
