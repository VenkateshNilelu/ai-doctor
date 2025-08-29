const express = require('express');
const router = express.Router();
const geminiService = require('../services/geminiService');
const { supabase } = require('../config/supabase');

// Generate diagnosis
router.post('/generate', async (req, res) => {
  try {
    const {
      fullName,
      age,
      sex,
      weight,
      allergies,
      symptoms,
      lang
    } = req.body;

    // Validation
    if (!fullName || !age || !sex || !weight || !symptoms) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['fullName', 'age', 'sex', 'weight', 'symptoms']
      });
    }

    // Age validation
    if (age < 0 || age > 120) {
      return res.status(400).json({
        error: 'Invalid age. Must be between 0 and 120 years.'
      });
    }

    // Weight validation
    if (weight < 0.5 || weight > 500) {
      return res.status(400).json({
        error: 'Invalid weight. Must be between 0.5 and 500 kg.'
      });
    }

    const patientData = {
      fullName: fullName.trim(),
      age: parseInt(age),
      sex: sex.toLowerCase(),
      weight: parseFloat(weight),
      allergies: allergies ? allergies.trim() : null,
      symptoms: symptoms.trim(),
      lang: (lang || 'en').toLowerCase()
    };

    // Check for critical symptoms that need immediate attention
    const criticalSymptoms = [
      'chest pain', 'difficulty breathing', 'severe bleeding',
      'unconscious', 'seizure', 'stroke symptoms',
      'heart attack', 'severe trauma', 'poisoning'
    ];

    const hasCriticalSymptoms = criticalSymptoms.some(symptom =>
      patientData.symptoms.toLowerCase().includes(symptom)
    );

    if (hasCriticalSymptoms) {
      const emergencyMessages = {
        en: {
          title: '🚨 EMERGENCY: Refer to emergency medical care immediately',
          critical: 'CRITICAL SYMPTOMS DETECTED:',
          actionTitle: 'IMMEDIATE ACTION REQUIRED:',
          actions: [
            'Call emergency services (911/112)',
            'Do not wait for AI diagnosis',
            'Seek immediate medical attention'
          ],
          tail: 'This is a medical emergency that requires immediate professional medical care.'
        },
        hi: {
          title: '🚨 आपातकाल: तुरंत आपातकालीन चिकित्सा सहायता लें',
          critical: 'गंभीर लक्षण पाए गए:',
          actionTitle: 'तत्काल आवश्यक कार्रवाई:',
          actions: [
            'आपातकालीन सेवा (112/108) पर कॉल करें',
            'एआई निदान का इंतजार न करें',
            'तुरंत चिकित्सकीय सहायता लें'
          ],
          tail: 'यह एक चिकित्सा आपातकाल है जिसके लिए तुरंत डॉक्टर की आवश्यकता है।'
        },
        mr: {
          title: '🚨 आपत्काल: तात्काळ आपत्कालीन वैद्यकीय मदत घ्या',
          critical: 'गंभीर लक्षण आढळले:',
          actionTitle: 'तात्काळ आवश्यक कृती:',
          actions: [
            'आपत्कालीन सेवांना कॉल करा (112/108)',
            'एआय निदानाची प्रतीक्षा करू नका',
            'तात्काळ वैद्यकीय मदत घ्या'
          ],
          tail: 'हा वैद्यकीय आपत्काल आहे ज्यासाठी तातडीने डॉक्टरांची गरज आहे.'
        }
      };
      const EM = emergencyMessages[patientData.lang] || emergencyMessages.en;
      return res.json({
        diagnosis: `${EM.title}

⚠️ ${EM.critical}
${patientData.symptoms}

🚑 ${EM.actionTitle}
- ${EM.actions[0]}
- ${EM.actions[1]}
- ${EM.actions[2]}

${EM.tail}`,
        confidence: 100,
        isEmergency: true,
        needsReferral: true,
        timestamp: new Date().toISOString(),
        criticalWarning: true
      });
    }

    // Generate AI diagnosis
    const diagnosisResult = await geminiService.generateDiagnosis(patientData);

    // Store in Supabase if available
    if (supabase) {
      try {
        await supabase
          .from('diagnoses')
          .insert({
            patient_name: patientData.fullName,
            age: patientData.age,
            sex: patientData.sex,
            weight: patientData.weight,
            allergies: patientData.allergies,
            symptoms: patientData.symptoms,
            diagnosis: diagnosisResult.diagnosis,
            confidence: diagnosisResult.confidence,
            is_emergency: diagnosisResult.isEmergency,
            needs_referral: diagnosisResult.needsReferral,
            created_at: new Date().toISOString()
          });
      } catch (dbError) {
        console.warn('Failed to store diagnosis in database:', dbError.message);
        // Continue without failing the request
      }
    }

    res.json({
      success: true,
      ...diagnosisResult,
      patientData
    });

  } catch (error) {
    console.error('Diagnosis generation error:', error);
    res.status(500).json({
      error: 'Failed to generate diagnosis',
      message: error.message
    });
  }
});

// Get diagnosis history
router.get('/history', async (req, res) => {
  try {
    if (!supabase) {
      return res.status(503).json({
        error: 'Database not configured',
        message: 'Supabase credentials not available'
      });
    }

    const { data, error } = await supabase
      .from('diagnoses')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;

    res.json({
      success: true,
      diagnoses: data || []
    });

  } catch (error) {
    console.error('History retrieval error:', error);
    res.status(500).json({
      error: 'Failed to retrieve diagnosis history',
      message: error.message
    });
  }
});

module.exports = router;
