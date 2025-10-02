import express from 'express';
import { body } from 'express-validator';
import {
    createAppointment,
    getAppointments,
    getAppointmentById,
    updateAppointment,
    cancelAppointment,
    getAvailableTimeSlots,
    getMuseumConfigs
} from '../controllers/appointmentController';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = express.Router();

// Validation middleware
const appointmentValidation = [
    body('visitorName').notEmpty().trim().withMessage('Visitor name is required'),
    body('visitorEmail').optional({ nullable: true, checkFalsy: true }).isEmail().normalizeEmail().withMessage('Valid email is required if provided'),
    body('visitorPhone').optional({ nullable: true, checkFalsy: true }).trim(),
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
router.get('/configs', getMuseumConfigs);
router.get('/time-slots', getAvailableTimeSlots);
router.post('/', authenticate, requireAdmin, appointmentValidation, createAppointment);
router.get('/', authenticate, requireAdmin, getAppointments);
router.get('/:id', authenticate, requireAdmin, getAppointmentById);
router.put('/:id', authenticate, requireAdmin, updateAppointment);
router.patch('/:id/cancel', authenticate, requireAdmin, cancelAppointment);

export default router;
