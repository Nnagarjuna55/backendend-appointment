import { Request, Response } from 'express';
import { clientPlaceStorageService, ClientPlaceBookingData } from '../services/clientPlaceStorage';
// Remove unused import

// Store booking in client place database
export const storeClientPlaceBooking = async (req: Request, res: Response) => {
    try {
        console.log('💾 Storing booking in client place database...');

        const { bookingId, visitorName, idNumber, idType, museum, visitDate, timeSlot, numberOfVisitors, visitorDetails } = req.body;

        const bookingData: ClientPlaceBookingData = {
            bookingId,
            visitorName,
            idNumber,
            idType,
            museum,
            visitDate: new Date(visitDate),
            timeSlot,
            numberOfVisitors,
            visitorDetails
        };

        const result = await clientPlaceStorageService.storeClientPlaceBooking(bookingData);

        if (result.success) {
            res.status(201).json({
                success: true,
                message: 'Booking stored in client place database',
                data: {
                    clientPlaceBooking: result.clientPlaceBooking,
                    museumBookingId: result.museumBookingId,
                    confirmationCode: result.confirmationCode
                }
            });
        } else {
            res.status(400).json({
                success: false,
                message: 'Failed to store booking in client place database',
                error: result.error
            });
        }

    } catch (error) {
        console.error('❌ Store client place booking failed:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};

// Book in museum system and store in client place
export const bookInMuseumSystem = async (req: Request, res: Response) => {
    try {
        console.log('🎯 Booking in museum system and storing in client place...');

        const { bookingId, visitorName, idNumber, idType, museum, visitDate, timeSlot, numberOfVisitors, visitorDetails } = req.body;

        const bookingData: ClientPlaceBookingData = {
            bookingId,
            visitorName,
            idNumber,
            idType,
            museum,
            visitDate: new Date(visitDate),
            timeSlot,
            numberOfVisitors,
            visitorDetails
        };

        const result = await clientPlaceStorageService.bookInMuseumSystem(bookingData);

        if (result.success) {
            res.status(201).json({
                success: true,
                message: 'Booking created in museum system and stored in client place',
                data: {
                    clientPlaceBooking: result.clientPlaceBooking,
                    museumBookingId: result.museumBookingId,
                    confirmationCode: result.confirmationCode,
                    clientPlaceResponse: result.clientPlaceResponse
                }
            });
        } else {
            res.status(400).json({
                success: false,
                message: 'Failed to book in museum system',
                error: result.error
            });
        }

    } catch (error) {
        console.error('❌ Museum system booking failed:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};

// Verify client place booking
export const verifyClientPlaceBooking = async (req: Request, res: Response) => {
    try {
        console.log('🔍 Verifying client place booking...');

        const { bookingId } = req.params;

        const result = await clientPlaceStorageService.verifyClientPlaceBooking(bookingId);

        if (result.success) {
            res.status(200).json({
                success: true,
                message: 'Client place booking verified',
                data: {
                    clientPlaceBooking: result.clientPlaceBooking,
                    museumBookingId: result.museumBookingId,
                    confirmationCode: result.confirmationCode
                }
            });
        } else {
            res.status(404).json({
                success: false,
                message: 'Client place booking not found or not verified',
                error: result.error
            });
        }

    } catch (error) {
        console.error('❌ Client place verification failed:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};

// Get all client place bookings
export const getClientPlaceBookings = async (req: Request, res: Response) => {
    try {
        console.log('📋 Retrieving client place bookings...');

        const { status, museum, dateFrom, dateTo } = req.query;

        const filters: any = {};

        if (status) filters.status = status;
        if (museum) filters.museum = museum;
        if (dateFrom) filters.dateFrom = new Date(dateFrom as string);
        if (dateTo) filters.dateTo = new Date(dateTo as string);

        const bookings = await clientPlaceStorageService.getClientPlaceBookings(filters);

        res.status(200).json({
            success: true,
            message: 'Client place bookings retrieved',
            data: bookings,
            count: bookings.length
        });

    } catch (error) {
        console.error('❌ Failed to retrieve client place bookings:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};

// Get client place booking by ID
export const getClientPlaceBookingById = async (req: Request, res: Response) => {
    try {
        console.log(`🔍 Retrieving client place booking: ${req.params.id}`);

        const booking = await clientPlaceStorageService.getClientPlaceBookingById(req.params.id);

        if (booking) {
            res.status(200).json({
                success: true,
                message: 'Client place booking found',
                data: booking
            });
        } else {
            res.status(404).json({
                success: false,
                message: 'Client place booking not found'
            });
        }

    } catch (error) {
        console.error('❌ Failed to retrieve client place booking:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};

// Update client place booking status
export const updateClientPlaceBookingStatus = async (req: Request, res: Response) => {
    try {
        console.log(`🔄 Updating client place booking status: ${req.params.id}`);

        const { status, clientPlaceResponse } = req.body;

        if (!status || !['pending', 'confirmed', 'failed', 'verified'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status. Must be one of: pending, confirmed, failed, verified'
            });
        }

        const result = await clientPlaceStorageService.updateClientPlaceBookingStatus(
            req.params.id,
            status,
            clientPlaceResponse
        );

        if (result) {
            res.status(200).json({
                success: true,
                message: 'Client place booking status updated'
            });
        } else {
            res.status(404).json({
                success: false,
                message: 'Client place booking not found or not updated'
            });
        }

    } catch (error) {
        console.error('❌ Failed to update client place booking status:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};

// Get client place booking statistics
export const getClientPlaceStatistics = async (req: Request, res: Response) => {
    try {
        console.log('📊 Retrieving client place booking statistics...');

        const { ClientPlaceBooking } = await import('../models/ClientPlaceBooking');

        const totalBookings = await ClientPlaceBooking.countDocuments();
        const confirmedBookings = await ClientPlaceBooking.countDocuments({ clientPlaceStatus: 'confirmed' });
        const verifiedBookings = await ClientPlaceBooking.countDocuments({ clientPlaceStatus: 'verified' });
        const failedBookings = await ClientPlaceBooking.countDocuments({ clientPlaceStatus: 'failed' });
        const pendingBookings = await ClientPlaceBooking.countDocuments({ clientPlaceStatus: 'pending' });

        const museumStats = await ClientPlaceBooking.aggregate([
            {
                $group: {
                    _id: '$museum',
                    count: { $sum: 1 },
                    confirmed: {
                        $sum: { $cond: [{ $eq: ['$clientPlaceStatus', 'confirmed'] }, 1, 0] }
                    },
                    verified: {
                        $sum: { $cond: [{ $eq: ['$clientPlaceStatus', 'verified'] }, 1, 0] }
                    }
                }
            }
        ]);

        res.status(200).json({
            success: true,
            message: 'Client place booking statistics retrieved',
            data: {
                total: totalBookings,
                confirmed: confirmedBookings,
                verified: verifiedBookings,
                failed: failedBookings,
                pending: pendingBookings,
                successRate: totalBookings > 0 ? Math.round(((confirmedBookings + verifiedBookings) / totalBookings) * 100) : 0,
                museumStats: museumStats
            }
        });

    } catch (error) {
        console.error('❌ Failed to retrieve client place statistics:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
