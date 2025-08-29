const axios = require('axios');
require('dotenv').config({ path: '../config.env' });

class GeminiService {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY;
    this.baseURL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent';
  }

  async generateDiagnosis(patientData) {
    try {
      const prompt = this.buildMedicalPrompt(patientData);
      
      const response = await axios.post(`${this.baseURL}?key=${this.apiKey}`, {
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.3,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2048,
        },
        safetySettings: [
          {
            category: "HARM_CATEGORY_HARASSMENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_HATE_SPEECH",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          }
        ]
      });

      const diagnosis = response.data.candidates[0].content.parts[0].text;
      return this.parseDiagnosis(diagnosis);
    } catch (error) {
      console.error('Gemini API Error:', error.response?.data || error.message);
      throw new Error('Failed to generate diagnosis. Please try again.');
    }
  }

  buildMedicalPrompt(patientData) {
    const langMap = { en: 'English', hi: 'Hindi', mr: 'Marathi' };
    const language = langMap[patientData.lang] || 'English';
    return `You are a medical AI assistant. Analyze the following patient information and provide a safe, evidence-based medical assessment.

Respond entirely in ${language}. Use medically appropriate terminology for ${language}. If any headings or table labels are used, translate them to ${language} as well.

PATIENT INFORMATION:
- Name: ${patientData.fullName}
- Age: ${patientData.age} years
- Sex: ${patientData.sex}
- Weight: ${patientData.weight} kg
- Allergies: ${patientData.allergies || 'None reported'}
- Symptoms: ${patientData.symptoms}

IMPORTANT SAFETY RULES:
1. NEVER make final prescriptions for critical or life-threatening cases
2. ALWAYS flag dangerous symptoms that require immediate medical attention
3. Only recommend medications backed by WHO/FDA guidelines
4. Include confidence levels for all assessments
5. Emphasize this is for informational purposes only

Please provide a response in this exact format (and translate all headings and column names to ${language}).

When suggesting medications, follow these extra rules:
• If multiple clinically appropriate formulations exist (e.g., tablet/syrup, cream/ointment/gel, eye/ear/nasal drops, inhaler), provide 2–4 best options as separate rows in the medications table.
• Tailor route and dose by age/weight and the reported symptoms.
• Prefer generic names; include brand name in parentheses only if commonly used.
• If topical forms (creams/ointments) or drops are relevant, list them explicitly with correct route (e.g., topical, ocular, otic, nasal) and frequency.

Provide the response in the following structure:

📄 Prescription Summary

👤 Patient Information:  
Name: ${patientData.fullName}  
Age: ${patientData.age}  
Sex: ${patientData.sex}  
Weight: ${patientData.weight} kg  
Allergies: ${patientData.allergies || "None"}

🩺 Symptoms Reported:  
${patientData.symptoms}

🧠 Diagnosis:  
[Your diagnosis here]

# MACHINE-READABLE: On a separate line include exactly:
CONFIDENCE_PERCENT=[percentage without % sign]

💊 Medications:  
| Medication     | Dose       | Route       | Frequency                  | Duration / Max Dose  |  
|----------------|------------|-------------|----------------------------|---------------------|  
| [Medication]   | [Dose]     | [Route]     | [Frequency]                | [Duration/Max Dose] |

⚠️ Warnings and Precautions:  
- [Red flag symptom 1]  
- [Red flag symptom 2]  
- [Red flag symptom 3]  
- [Red flag symptom 4]  
- [Red flag symptom 5]  

📅 Date: ${new Date().toISOString().split('T')[0]}

---

⚠️ Disclaimer:  
This prescription summary is for informational purposes only and does not replace professional medical advice. Please consult a qualified healthcare provider for diagnosis and treatment.

CRITICAL: If you detect any life-threatening symptoms, immediately add "🚨 EMERGENCY: Refer to emergency medical care immediately" at the top.`;
  }

  parseDiagnosis(diagnosis) {
    // Extract confidence (prefer machine-readable marker; fallback to any language)
    let confidence = 0;
    const machine = diagnosis.match(/CONFIDENCE_PERCENT\s*=\s*(\d{1,3})/i);
    if (machine) {
      confidence = parseInt(machine[1]);
    } else {
      const anyPercent = diagnosis.match(/(Confidence|Confidence\s*Level|आत्मविश्वास|विश्वास|विश्वास\s*पातळी)[^\d]{0,15}(\d{1,3})%/i);
      confidence = anyPercent ? parseInt(anyPercent[2]) : 0;
    }

    // Determine emergency state: only if explicitly signaled at the top
    const head = diagnosis.slice(0, 200).toLowerCase();
    const isEmergency = /^\s*🚨/.test(diagnosis) || /\bemergency:\b/.test(head) || /refer to emergency medical care/.test(head);

    // Check for referral keywords
    const referralKeywords = ['refer to provider', 'consult doctor', 'medical attention'];
    const needsReferral = referralKeywords.some(keyword => 
      diagnosis.toLowerCase().includes(keyword)
    );

    return {
      diagnosis,
      confidence,
      isEmergency,
      needsReferral,
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = new GeminiService();
