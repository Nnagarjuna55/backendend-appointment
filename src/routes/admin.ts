import express from 'express';
import { body } from 'express-validator';
import {
    getDashboardStats,
    getAllAppointments,
    getAppointmentsCount,
    updateAppointmentStatus,
    confirmAllPendingAppointments,
    systemHealthCheck,
    manualClearExpiredAppointments,
    createMuseumConfig,
    updateMuseumConfig,
    getMuseumConfigs,
    createUser,
    getUsers,
    updateUser,
    deleteUser
} from '../controllers/adminController';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = express.Router();

// All admin routes require authentication and admin role
router.use(authenticate);
router.use(requireAdmin);

// Dashboard
router.get('/dashboard', getDashboardStats);
router.get('/health', systemHealthCheck);
router.post('/clear-expired', manualClearExpiredAppointments);

// Appointments management
router.get('/appointments/count', getAppointmentsCount);
router.get('/appointments', getAllAppointments);
router.patch('/appointments/:id/status', updateAppointmentStatus);
router.post('/appointments/confirm-all', confirmAllPendingAppointments);

// Museum configuration
router.get('/museum-configs', getMuseumConfigs);
router.post('/museum-configs', createMuseumConfig);
router.put('/museum-configs/:id', updateMuseumConfig);

// User management
router.get('/users', getUsers);
router.post('/users', createUser);
router.put('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);

export default router;
