import express from 'express';
import { body } from 'express-validator';
import {
    createVisitPlan,
    getVisitPlans,
    convertToAppointment,
    deleteVisitPlan
} from '../controllers/visitPlanController';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// Validation middleware
const visitPlanValidation = [
    body('visitorName').notEmpty().trim().withMessage('Visitor name is required'),
    body('visitorEmail').optional().isEmail().normalizeEmail().withMessage('Valid email is required if provided'),
    body('visitorPhone').optional().notEmpty().trim().withMessage('Phone number is required if provided'),
    body('idNumber').notEmpty().trim().withMessage('ID number is required'),
    body('idType').isIn(['passport', 'id_card', 'hk_macau_passport', 'taiwan_permit', 'foreign_id'])
        .withMessage('Valid ID type is required'),
    body('museum').isIn(['main', 'qin_han']).withMessage('Valid museum selection is required'),
    body('visitDate').isISO8601().withMessage('Valid visit date is required'),
    body('timeSlot').notEmpty().trim().withMessage('Time slot is required'),
    body('numberOfVisitors').isInt({ min: 1, max: 5 }).withMessage('Number of visitors must be between 1 and 5'),
    body('visitorDetails').isArray({ min: 1, max: 5 }).withMessage('Visitor details are required')
];

// Routes
router.post('/', authenticate, visitPlanValidation, createVisitPlan);
router.get('/', authenticate, getVisitPlans);
router.post('/:planId/convert', authenticate, convertToAppointment);
router.delete('/:planId', authenticate, deleteVisitPlan);

export default router;
