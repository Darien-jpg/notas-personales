const express = require('express');
const Note = require('../models/Note');
const { auth } = require('../middleware/auth');
const router = express.Router();

// GET - Obtener todas las notas del usuario
router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, limit = 10, category, search } = req.query;
    
    let query = { user: req.user._id };
    
    // Filtrar por categoría
    if (category && category !== 'all') {
      query.category = category;
    }
    
    // Búsqueda en título y contenido
    if (search) {
      query.$text = { $search: search };
    }
    
    const notes = await Note.find(query)
      .sort({ isPinned: -1, createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await Note.countDocuments(query);
    
    res.json({
      success: true,
      notes,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener las notas',
      error: error.message
    });
  }
});

// GET - Obtener una nota específica
router.get('/:id', auth, async (req, res) => {
  try {
    const note = await Note.findOne({
      _id: req.params.id,
      user: req.user._id
    });
    
    if (!note) {
      return res.status(404).json({
        success: false,
        message: 'Nota no encontrada'
      });
    }
    
    res.json({
      success: true,
      note
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener la nota',
      error: error.message
    });
  }
});

// POST - Crear nueva nota
router.post('/', auth, async (req, res) => {
  try {
    const { title, content, category, color } = req.body;
    
    const note = new Note({
      title,
      content,
      category,
      color,
      user: req.user._id
    });
    
    await note.save();
    
    res.status(201).json({
      success: true,
      message: 'Nota creada exitosamente',
      note
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al crear la nota',
      error: error.message
    });
  }
});

// PUT - Actualizar nota
router.put('/:id', auth, async (req, res) => {
  try {
    const { title, content, category, color, isPinned } = req.body;
    
    const note = await Note.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { title, content, category, color, isPinned },
      { new: true, runValidators: true }
    );
    
    if (!note) {
      return res.status(404).json({
        success: false,
        message: 'Nota no encontrada'
      });
    }
    
    res.json({
      success: true,
      message: 'Nota actualizada exitosamente',
      note
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al actualizar la nota',
      error: error.message
    });
  }
});

// DELETE - Eliminar nota
router.delete('/:id', auth, async (req, res) => {
  try {
    const note = await Note.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id
    });
    
    if (!note) {
      return res.status(404).json({
        success: false,
        message: 'Nota no encontrada'
      });
    }
    
    res.json({
      success: true,
      message: 'Nota eliminada exitosamente'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al eliminar la nota',
      error: error.message
    });
  }
});

module.exports = router;