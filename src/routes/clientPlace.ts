import express from 'express';
import { checkClientPlaceStatus, createClientPlaceBooking } from '../controllers/clientPlaceController';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = express.Router();

// Client place integration routes
router.get('/status', authenticate, requireAdmin, checkClientPlaceStatus);
router.post('/booking', authenticate, requireAdmin, createClientPlaceBooking);

export default router;
