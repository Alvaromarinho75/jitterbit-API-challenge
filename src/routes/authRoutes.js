const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Rota POST para fazer login e receber o JWT
router.post('/login', authController.login);

module.exports = router;