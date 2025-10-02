import express from 'express';
import { body } from 'express-validator';
import {
    validateEntry,
    getEntryStats
} from '../controllers/entryController';

const router = express.Router();

// Validation middleware
const entryValidation = [
    body('bookingReference').notEmpty().trim().withMessage('Booking reference is required'),
    body('idNumber').notEmpty().trim().withMessage('ID number is required'),
    body('museum').isIn(['main', 'qin_han']).withMessage('Valid museum selection is required')
];

// Routes
router.post('/validate', entryValidation, validateEntry);
router.get('/stats', getEntryStats);

export default router;
