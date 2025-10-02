import express from 'express';
import { body } from 'express-validator';
import {
    createNoShowPenalty,
    checkPenaltyStatus,
    getPenalties,
    removePenalty
} from '../controllers/noShowController';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = express.Router();

// Validation middleware
const penaltyValidation = [
    body('idNumber').notEmpty().trim().withMessage('ID number is required'),
    body('idType').notEmpty().trim().withMessage('ID type is required'),
    body('reason').isIn(['no_show', 'late_cancellation', 'invalid_booking'])
        .withMessage('Valid penalty reason is required')
];

// Routes
router.post('/', authenticate, requireAdmin, penaltyValidation, createNoShowPenalty);
router.get('/check/:idNumber', checkPenaltyStatus);
router.get('/', authenticate, requireAdmin, getPenalties);
router.patch('/:penaltyId/remove', authenticate, requireAdmin, removePenalty);

export default router;
