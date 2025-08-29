const express = require('express');
const router = express.Router();
const { supabase } = require('../config/supabase');

// Create new patient
router.post('/', async (req, res) => {
  try {
    const {
      fullName,
      age,
      sex,
      weight,
      allergies,
      contactInfo
    } = req.body;

    // Validation
    if (!fullName || !age || !sex || !weight) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['fullName', 'age', 'sex', 'weight']
      });
    }

    if (!supabase) {
      return res.status(503).json({
        error: 'Database not configured',
        message: 'Supabase credentials not available'
      });
    }

    const { data, error } = await supabase
      .from('patients')
      .insert({
        full_name: fullName.trim(),
        age: parseInt(age),
        sex: sex.toLowerCase(),
        weight: parseFloat(weight),
        allergies: allergies ? allergies.trim() : null,
        contact_info: contactInfo || null,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      success: true,
      patient: data
    });

  } catch (error) {
    console.error('Patient creation error:', error);
    res.status(500).json({
      error: 'Failed to create patient',
      message: error.message
    });
  }
});

// Get all patients
router.get('/', async (req, res) => {
  try {
    if (!supabase) {
      return res.status(503).json({
        error: 'Database not configured',
        message: 'Supabase credentials not available'
      });
    }

    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({
      success: true,
      patients: data || []
    });

  } catch (error) {
    console.error('Patient retrieval error:', error);
    res.status(500).json({
      error: 'Failed to retrieve patients',
      message: error.message
    });
  }
});

// Get patient by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!supabase) {
      return res.status(503).json({
        error: 'Database not configured',
        message: 'Supabase credentials not available'
      });
    }

    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({
        error: 'Patient not found'
      });
    }

    res.json({
      success: true,
      patient: data
    });

  } catch (error) {
    console.error('Patient retrieval error:', error);
    res.status(500).json({
      error: 'Failed to retrieve patient',
      message: error.message
    });
  }
});

// Update patient
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    if (!supabase) {
      return res.status(503).json({
        error: 'Database not configured',
        message: 'Supabase credentials not available'
      });
    }

    const { data, error } = await supabase
      .from('patients')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      patient: data
    });

  } catch (error) {
    console.error('Patient update error:', error);
    res.status(500).json({
      error: 'Failed to update patient',
      message: error.message
    });
  }
});

// Delete patient
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!supabase) {
      return res.status(503).json({
        error: 'Database not configured',
        message: 'Supabase credentials not available'
      });
    }

    const { error } = await supabase
      .from('patients')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({
      success: true,
      message: 'Patient deleted successfully'
    });

  } catch (error) {
    console.error('Patient deletion error:', error);
    res.status(500).json({
      error: 'Failed to delete patient',
      message: error.message
    });
  }
});

module.exports = router;
