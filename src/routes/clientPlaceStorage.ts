import express from 'express';
import {
    storeClientPlaceBooking,
    bookInMuseumSystem,
    verifyClientPlaceBooking,
    getClientPlaceBookings,
    getClientPlaceBookingById,
    updateClientPlaceBookingStatus,
    getClientPlaceStatistics
} from '../controllers/clientPlaceStorageController';

const router = express.Router();

// Store booking in client place database
router.post('/store', storeClientPlaceBooking);

// Book in museum system and store in client place
router.post('/book', bookInMuseumSystem);

// Verify client place booking
router.get('/verify/:bookingId', verifyClientPlaceBooking);

// Get all client place bookings
router.get('/bookings', getClientPlaceBookings);

// Get client place booking by ID
router.get('/bookings/:id', getClientPlaceBookingById);

// Update client place booking status
router.patch('/bookings/:id/status', updateClientPlaceBookingStatus);

// Get client place booking statistics
router.get('/statistics', getClientPlaceStatistics);

export default router;
