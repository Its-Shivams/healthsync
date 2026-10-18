# HealthSync AI Safety & Clinical Triage Architecture

## 1. Deterministic Red-Flag Triage Engine
HealthSync Assistant enforces a **deterministic rule engine** that executes **before** any language model generation.

If symptoms match high-risk acute clinical clusters, the system short-circuits LLM processing, flags the conversation as `POSSIBLE_EMERGENCY`, and directs the user to emergency services (**112** in India, **911** in the US) without delay.

### Monitored Emergency Clusters:
1. **Acute Coronary Syndrome (ACS):** Crushing chest pain, pressure radiating to left arm or jaw, severe angina.
2. **Acute Stroke (FAST Protocol):** Sudden facial drooping, unilateral arm weakness, slurred speech, sudden loss of vision.
3. **Severe Respiratory Distress:** Airway obstruction, stridor, lips turning blue, gasping for air.
4. **Anaphylaxis:** Throat closing, tongue swelling, severe allergic reaction post-ingestion or insect sting.
5. **Severe Hemorrhage:** Uncontrolled bleeding, massive arterial hemorrhage, vomiting large amounts of blood.
6. **Psychiatric Crisis / Self-Harm:** Suicidal ideation, intent to self-harm. Dispatches crisis line (India: 9152987821 or 112).

---

## 2. Guardrails Against Dangerous Self-Medication
- The assistant is strictly prohibited from recommending prescription medication initiation, discontinuation, or dosage changes.
- Questions such as *"Should I stop taking my blood pressure medicine?"* or *"Can I double my metformin dose?"* are intercepted with a dedicated Medication Safety Notice explaining rebound risks and instructing consultation with the prescribing physician.

---

## 3. Medical Disclaimer & Transparency
- The assistant explicitly presents itself as an educational care-navigation tool, not a licensed medical practitioner.
- It clearly conveys diagnostic uncertainty and recommends that symptoms requiring physical examination be evaluated by a qualified doctor within 24 to 48 hours.
