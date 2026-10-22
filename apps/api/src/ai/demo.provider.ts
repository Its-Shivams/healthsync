import { Injectable } from '@nestjs/common';
import { IAIProvider, AIMessageHistory, AIProviderResponse, AIAttachment } from './ai-provider.interface';

@Injectable()
export class DemoClinicalProvider implements IAIProvider {
  name = 'Clinical Demo Adapter (Non-LLM Offline Alternative)';

  async isAvailable(): Promise<boolean> {
    return true;
  }

  async generateResponse(
    prompt: string,
    systemPrompt: string,
    history: AIMessageHistory[],
    attachment?: AIAttachment,
  ): Promise<AIProviderResponse> {
    const text = prompt.toLowerCase();
    let responseText = '';

    if (attachment) {
      const isPdf = attachment.mimeType === 'application/pdf' || (attachment.fileName && attachment.fileName.toLowerCase().endsWith('.pdf'));
      const docType = isPdf ? 'Clinical Diagnostic Report / Prescription PDF' : 'Prescription / Diagnostic Document Image';

      responseText = `### 📋 Medical Document Analysis: ${attachment.fileName || docType}

**1. Document Classification & Metadata**
- **Type:** ${isPdf ? 'Multi-page Diagnostic / Prescription Report' : 'Clinical Prescription / Laboratory Report'}
- **Format:** Verified Multimodal Scanned Document (${attachment.mimeType})

---

**2. Key Medications & Findings Detected**
- **Prescribed Regimen:**
  - **Amlodipine (5 mg)** — *1 tablet once daily in the morning*. Indicated for arterial blood pressure control.
  - **Metformin (500 mg)** — *1 tablet twice daily with meals*. Indicated for glycemic regulation and insulin sensitivity.
  - **Atorvastatin (10 mg)** — *1 tablet once daily at bedtime*. Indicated for lipid profile optimization.
- **Key Clinical / Diagnostic Indicators:**
  - **Blood Pressure:** 134/86 mmHg *(Improved control with oral therapy)*.
  - **HbA1c:** 6.7% *(Within manageable glycemic range)*.
  - **Serum Creatinine:** 0.9 mg/dL *(Normal reference range: 0.7 – 1.3 mg/dL)*.

---

**3. Plain-Language Patient Summary**
Your doctor has prescribed a balanced regimen focused on cardiovascular and metabolic health. Your kidney function indicators (serum creatinine) are in the normal range. The medications work together to regulate daytime blood pressure, manage meal-related glucose spikes, and support healthy cholesterol levels.

---

**4. ⚠️ Precautions & Targeted Questions for Your Doctor**
- **Adherence:** Take prescribed medications at regular scheduled times. Never abruptly discontinue therapy without physician advice.
- **Daily Log:** Track your blood pressure readings and fasting glucose in your HealthSync Vitals dashboard.
- **Recommended Follow-up Questions:**
  - *"Should I maintain a daily BP log for review at our next visit?"*
  - *"Are there any dietary interactions I should be mindful of with these medications?"*

> **Clinical Notice:** *This AI briefing provides patient educational guidance only. Please consult your prescribing physician before modifying any dosage or treatment plan.*`;
    } else if (text.includes('food') || text.includes('diet') || text.includes('eat') || text.includes('khana')) {
      responseText = `**Dietary & Nutritional Guidance:**

1. **Sodium / Salt Restriction:** Keep sodium below 1,500 - 2,000 mg/day (less than 1 level teaspoon). Avoid pickles (achar), processed snacks, papads, canned soups, and salty seasonings.
2. **DASH Diet Principles:** Emphasize leafy greens, spinach (palak), bottle gourd (lauki), oats, lentils (daal), and seasonal fresh fruits like bananas, apples, and pomegranates.
3. **Healthy Fats:** Limit saturated and trans-fats. Prefer small quantities of mustard, olive, or sunflower oil. Avoid deep-fried foods.
4. **Hydration:** Maintain 2 to 2.5 liters of clean water daily unless fluid-restricted by your nephrologist or cardiologist.

*Note: This is general nutritional education. Always confirm dietary adjustments with your physician.*`;
    } else if (text.includes('pressure') || text.includes('bp') || text.includes('hypertension')) {
      responseText = `**Blood Pressure Monitoring & Care:**

- **Target Clinical Threshold:** For most adults, blood pressure under 120/80 mmHg is considered optimal. Readouts consistently above 130/80 mmHg warrant clinical assessment for hypertension.
- **Proper Measurement Technique:** Rest quietly for 5 minutes before checking. Keep your arm at heart level with feet flat on the floor. Take two readings spaced 1 minute apart and record the average in your HealthSync health log.
- **Lifestyle Synergy:** Regular aerobic exercise (e.g., 30 minutes of brisk walking 5 days a week) can reduce systolic BP by 4–9 mmHg.

*Medical Notice: Never discontinue or reduce antihypertensive medication without your doctor's supervision.*`;
    } else if (text.includes('sugar') || text.includes('glucose') || text.includes('diabetes') || text.includes('hba1c')) {
      responseText = `**Blood Glucose & Glycemic Health:**

- **Standard Fasting Target:** 70–99 mg/dL for non-diabetic individuals; 80–130 mg/dL for individuals managing diabetes.
- **Post-Prandial (2h after meal):** Under 140 mg/dL normal; under 180 mg/dL diabetic target.
- **HbA1c (3-Month Average):** Below 5.7% is normal; 5.7%–6.4% indicates prediabetes; 6.5% or above indicates diabetes.
- **Routine Monitoring:** Keep a regular glucose log and share it with your endocrinologist during scheduled consultations.`;
    } else if (text.includes('fever') || text.includes('bukhar') || text.includes('temperature')) {
      responseText = `**Fever & General Symptom Guidance:**

- Stay well-hydrated with water, electrolyte solutions, or clear broths.
- Rest in a well-ventilated, comfortable room.
- If fever persists for more than 48–72 hours, exceeds 102°F (38.9°C), or is accompanied by severe rash, stiff neck, or breathing difficulty, seek physical evaluation at a nearby healthcare clinic immediately.`;
    } else if (text.includes('compare') && (text.includes('report') || text.includes('test') || text.includes('result') || text.includes('last'))) {
      if (!systemPrompt.includes('PATIENT AUTHORIZED LABORATORY & DIAGNOSTIC REPORTS')) {
        responseText = `**Longitudinal Report Comparison:**

I do not have access to any medical or laboratory reports for your account. Please upload your diagnostic reports through the **Digital Health Vault** first so that I can compare your parameters.`;
      } else {
        responseText = `**Longitudinal Diagnostic Report Comparison:**

Here is a side-by-side comparison of your most recent diagnostic panels:

1. **Total Cholesterol:**
   - **Baseline (2025-03-15):** 224 mg/dL *(High, Ref: < 200 mg/dL)*
   - **Follow-up (2025-09-10):** 194 mg/dL *(Normal, Ref: < 200 mg/dL)*
   - **Trend:** Improved / Decreased by 30 mg/dL into the normal reference range.

2. **LDL Cholesterol (Bad Cholesterol):**
   - **Baseline (2025-03-15):** 148 mg/dL *(High, Ref: < 100 mg/dL)*
   - **Follow-up (2025-09-10):** 118 mg/dL *(Borderline, Ref: < 100 mg/dL)*
   - **Trend:** Decreased by 30 mg/dL, showing significant positive response.

3. **Triglycerides:**
   - **Baseline (2025-03-15):** 170 mg/dL *(High, Ref: < 150 mg/dL)*
   - **Follow-up (2025-09-10):** 140 mg/dL *(Normal, Ref: < 150 mg/dL)*
   - **Trend:** Decreased by 30 mg/dL into the normal range.

4. **Fasting Blood Glucose:**
   - **Baseline (2025-03-15):** 102 mg/dL *(Impaired fasting glucose, Ref: 70–99 mg/dL)*
   - **Follow-up (2025-09-10):** 92 mg/dL *(Normal, Ref: 70–99 mg/dL)*
   - **Trend:** Normal glycemic control restored (-10 mg/dL).

5. **HbA1c (Glycated Hemoglobin):**
   - **Baseline (2025-03-15):** 6.1% *(Prediabetic range, Ref: < 5.7%)*
   - **Follow-up (2025-09-10):** 5.6% *(Normal, Ref: < 5.7%)*
   - **Trend:** Reduced by 0.5% back into normal glycemic range.

### Reports Reviewed
- **Report 1:** "Complete Comprehensive Metabolic & Lipid Panel" (Date: 2025-09-10)
- **Report 2:** "Baseline Comprehensive Metabolic & Lipid Panel" (Date: 2025-03-15)

*Clinical Educational Disclaimer: These comparisons reflect your stored records and show favorable improvements across lipid and glycemic parameters. Please consult your physician for individualized medical advice.*`;
      }
    } else {
      responseText = `**Health Information & Care Navigation:**

Thank you for your inquiry. Based on your symptoms and inquiry:
- **Clinical Overview:** Your symptoms should be monitored closely. If they persist beyond 48 hours or worsen, schedule a consultation with a verified general physician or specialist through the HealthSync directory.
- **Self-Care Measures:** Prioritize adequate sleep, balanced nutrition, and hydration.
- **Questions for your Clinician:**
  1. *How long have these symptoms typically lasted in similar patients?*
  2. *Are there diagnostic tests (such as CBC or metabolic panel) recommended?*
  3. *What specific warning signs should prompt an emergency visit?*

*Disclaimer: HealthSync Assistant is an informational tool and does not provide formal medical diagnosis or prescription advice.*`;
    }

    const demoNotice = `\n\n*(Note: Generated by HealthSync Clinical Demo Adapter. To use a real local LLM, start Ollama with "ollama run llama3.2")*`;

    return {
      content: responseText + demoNotice,
      provider: 'demo_adapter',
      model: 'clinical-rules-v1',
      responseTimeMs: 85,
    };
  }
}
