import { Injectable, Logger } from '@nestjs/common';
import { TriageUrgency, TriageResult } from '@healthsync/shared-types';

@Injectable()
export class TriageEngineService {
  private readonly logger = new Logger(TriageEngineService.name);
  private readonly emergencyNumber = process.env.EMERGENCY_HELPLINE || '112';

  // Configurable clinical red-flag symptom clusters (English, Hindi, Hinglish)
  private readonly redFlagClusters = [
    {
      category: 'Acute Coronary Syndrome / Myocardial Infarction',
      keywords: [
        'chest pain',
        'crushing chest',
        'pressure in chest',
        'pain radiating to arm',
        'pain radiating to jaw',
        'heart attack',
        'severe angina',
        'dil me dard',
        'dil mein dard',
        'seene me dard',
        'seene mein jalan aur dard',
        'chhati me dard',
      ],
      directive: 'Immediate emergency medical care required for suspected cardiac event.',
    },
    {
      category: 'Acute Stroke (FAST Protocol)',
      keywords: [
        'face drooping',
        'facial weakness',
        'arm weakness',
        'slurred speech',
        'sudden numbness',
        'sudden loss of vision',
        'cannot speak',
        'stroke',
        'lakwa',
        'ek taraf sunn',
        'chehra tedha',
        'bolne me takleef',
      ],
      directive: 'Time-critical stroke protocol. Proceed immediately to the nearest hospital stroke center.',
    },
    {
      category: 'Severe Respiratory Distress',
      keywords: [
        'cannot breathe',
        'can not breathe',
        'cant breathe',
        'severe shortness of breath',
        'gasping for air',
        'choking',
        'lips turning blue',
        'stridor',
        'saans nahi aa rahi',
        'saans lene me bohot dikkat',
        'dum ghut raha',
      ],
      directive: 'Immediate oxygenation and airway emergency intervention required.',
    },
    {
      category: 'Anaphylaxis / Severe Allergic Reaction',
      keywords: [
        'throat closing',
        'throat swelling',
        'swollen tongue',
        'anaphylaxis',
        'cannot swallow after sting',
        'allergic reaction cant breathe',
        'gala band ho raha',
        'jeebh sooj gayi',
      ],
      directive: 'Suspected anaphylaxis. Administer epinephrine auto-injector if prescribed and call emergency.',
    },
    {
      category: 'Severe Hemorrhage / Uncontrolled Bleeding',
      keywords: [
        'massive bleeding',
        'uncontrolled bleeding',
        'spurting blood',
        'vomiting large amounts of blood',
        'coughing up blood heavily',
        'khoon ki ulti',
        'khoon band nahi ho raha',
      ],
      directive: 'Apply direct pressure and seek immediate trauma emergency care.',
    },
    {
      category: 'Psychiatric Emergency / Self-Harm Risk',
      keywords: [
        'want to kill myself',
        'suicide',
        'end my life',
        'suicidal thoughts',
        'want to die',
        'overdose on pills intentionally',
        'khudkushi',
        'jaan dena chahta',
      ],
      directive: 'Immediate mental health crisis support required. Connect with National Suicide Prevention Helpline (India: 9152987821 or 112).',
    },
  ];

  private readonly evaluationKeywords = [
    'fever for 3 days',
    'fever for 4 days',
    'fever for a week',
    'blood in urine',
    'blood in stool',
    'unexplained weight loss',
    'lump in breast',
    'persistent cough',
    'chronic pain',
    'high blood pressure reading',
    'sugar reading 300',
    'sugar 250',
    'vomiting for 2 days',
  ];

  private readonly medicationChangeKeywords = [
    'should i stop taking',
    'can i stop my medicine',
    'double my dose',
    'stop taking amlodipine',
    'stop taking metformin',
    'increase my dosage',
    'dawai band kar du',
    'dose badha lu',
  ];

  private readonly promptInjectionKeywords = [
    'ignore all previous instructions',
    'ignore previous instructions',
    'system prompt',
    'reveal system instructions',
    'you are now DAN',
    'bypass safety guidelines',
    'drop table',
    '<script>',
  ];

  evaluate(userInput: string): TriageResult {
    const text = userInput.toLowerCase();

    // 1. Detect prompt injection
    const hasInjection = this.promptInjectionKeywords.some((kw) => text.includes(kw));
    if (hasInjection) {
      this.logger.warn(`Security alert: Detected potential prompt injection attempt: "${userInput.substring(0, 50)}"`);
    }

    // 2. Deterministic Red-Flag Triage Check
    const matchedRedFlags: string[] = [];
    for (const cluster of this.redFlagClusters) {
      for (const kw of cluster.keywords) {
        if (text.includes(kw)) {
          matchedRedFlags.push(`${cluster.category}: ${cluster.directive}`);
          break;
        }
      }
    }

    if (matchedRedFlags.length > 0) {
      return {
        urgency: TriageUrgency.POSSIBLE_EMERGENCY,
        isEmergency: true,
        matchedRedFlags,
        recommendedAction: `EMERGENCY WARNING: Potential life-threatening medical emergency detected. Do not wait for chatbot questions or routine appointments. Immediately dial ${this.emergencyNumber} or proceed to the nearest emergency trauma center.`,
        emergencyNumber: this.emergencyNumber,
        disclaimer:
          'CRITICAL NOTICE: HealthSync Assistant has identified high-risk symptoms. This is an informational safety alert, not a definitive diagnosis. Seek immediate emergency evaluation.',
      };
    }

    // 3. Medication modification inquiry guardrail
    const isMedInquiry = this.medicationChangeKeywords.some((kw) => text.includes(kw));
    if (isMedInquiry) {
      return {
        urgency: TriageUrgency.MEDICAL_EVALUATION,
        isEmergency: false,
        matchedRedFlags: [],
        recommendedAction:
          'MEDICATION SAFETY WARNING: Never adjust, discontinue, or double prescription medications without direct evaluation and instruction from your prescribing doctor. Abruptly altering cardiovascular, diabetes, or psychiatric medication can cause severe rebound complications.',
        emergencyNumber: this.emergencyNumber,
        disclaimer:
          'HealthSync Assistant cannot prescribe or alter medication regimens. Consult your licensed healthcare provider.',
      };
    }

    // 4. Medical evaluation (within 24-48 hours)
    const needsEvaluation = this.evaluationKeywords.some((kw) => text.includes(kw));
    if (needsEvaluation) {
      return {
        urgency: TriageUrgency.MEDICAL_EVALUATION,
        isEmergency: false,
        matchedRedFlags: [],
        recommendedAction:
          'Clinical Medical Evaluation Advised: These persistent or concerning symptoms require direct physical examination, diagnostic tests, and evaluation by a qualified doctor within 24 to 48 hours.',
        emergencyNumber: this.emergencyNumber,
        disclaimer:
          'HealthSync Assistant is an informational care-navigation tool and does not provide formal medical diagnosis.',
      };
    }

    // 5. Routine care
    return {
      urgency: TriageUrgency.ROUTINE_CARE,
      isEmergency: false,
      matchedRedFlags: [],
      recommendedAction:
        'Routine Health Guidance: You may consult the assistant for general wellness education, understanding lab test terminology, or preparing questions for your next routine clinic visit.',
      emergencyNumber: this.emergencyNumber,
      disclaimer:
        'HealthSync Assistant is an informational tool and is not a substitute for professional medical diagnosis or personalized treatment plans.',
    };
  }
}
