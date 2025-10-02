import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import Appointment from '../models/Appointment';
import MuseumConfig from '../models/MuseumConfig';
import NoShowPenalty from '../models/NoShowPenalty';
import { AuthRequest } from '../middleware/auth';

export const createAppointment = async (req: AuthRequest, res: Response) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const appointmentData = req.body;

        // Check for active penalty
        const activePenalty = await NoShowPenalty.findOne({
            idNumber: appointmentData.idNumber,
            isActive: true,
            penaltyEndDate: { $gt: new Date() }
        });

        if (activePenalty) {
            return res.status(400).json({
                success: false,
                message: `This ID number is under penalty until ${activePenalty.penaltyEndDate.toDateString()}. Cannot book tickets for 180 days due to no-show violation.`
            });
        }

        // Get museum configuration
        const museumConfig = await MuseumConfig.findOne({ museum: appointmentData.museum });
        if (!museumConfig) {
            return res.status(400).json({
                success: false,
                message: 'Museum configuration not found'
            });
        }

        // Admin users can create reservations at any time (admin-only system)
        const isAdmin = req.user?.role === 'admin';
        if (!isAdmin) {
            return res.status(403).json({
                success: false,
                message: 'Only admin users can create reservations. This is an admin-only booking system.'
            });
        }

        // Check if appointment already exists for this ID number on the same date
        // Rule: Each ID number is limited to 1 visit ticket per day
        const visitDate = new Date(appointmentData.visitDate);
        const startOfDay = new Date(visitDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(visitDate);
        endOfDay.setHours(23, 59, 59, 999);

        const existingAppointment = await Appointment.findOne({
            idNumber: appointmentData.idNumber,
            visitDate: { $gte: startOfDay, $lte: endOfDay },
            status: { $in: ['pending', 'confirmed'] }
        });

        if (existingAppointment) {
            return res.status(400).json({
                success: false,
                message: 'Each ID number is limited to 1 visit ticket per day. This ID already has a booking for this date.'
            });
        }

        // Validate booking advance days (more flexible for admin users)
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (!isAdmin) {
            // Regular users: 5 days in advance limit
            const maxAdvanceDate = new Date(today);
            maxAdvanceDate.setDate(today.getDate() + museumConfig.bookingAdvanceDays);

            if (visitDate > maxAdvanceDate) {
                return res.status(400).json({
                    success: false,
                    message: `Tickets can only be booked ${museumConfig.bookingAdvanceDays} days in advance`
                });
            }
        } else {
            // Admin users: can book up to 30 days in advance
            const maxAdvanceDate = new Date(today);
            maxAdvanceDate.setDate(today.getDate() + 30);

            if (visitDate > maxAdvanceDate) {
                return res.status(400).json({
                    success: false,
                    message: `Admin bookings can be made up to 30 days in advance`
                });
            }
        }

        if (visitDate < today) {
            return res.status(400).json({
                success: false,
                message: 'Cannot book tickets for past dates'
            });
        }

        // Validate visitor limits (max 5 visitors per visit plan)
        // Rule: Each visit plan can add up to 5 visitors maximum
        if (appointmentData.numberOfVisitors > 5) {
            return res.status(400).json({
                success: false,
                message: 'Each visit plan can add up to 5 visitors maximum. Current request: ' + appointmentData.numberOfVisitors
            });
        }

        if (appointmentData.visitorDetails && appointmentData.visitorDetails.length > 5) {
            return res.status(400).json({
                success: false,
                message: 'Each visit plan can add up to 5 visitors maximum. Current visitor details: ' + appointmentData.visitorDetails.length
            });
        }

        // Ensure numberOfVisitors matches visitorDetails length
        if (appointmentData.visitorDetails && appointmentData.numberOfVisitors !== appointmentData.visitorDetails.length) {
            return res.status(400).json({
                success: false,
                message: 'Number of visitors must match the visitor details provided'
            });
        }

        // Set ticket validity (same day only)
        // Rule: Tickets are valid on the same day, and the tickets of the two museums are not interchangeable
        const ticketValidDate = new Date(visitDate);
        ticketValidDate.setHours(23, 59, 59, 999); // End of day - tickets expire at end of visit date

        // Generate booking reference with museum prefix
        const timestamp = Date.now().toString();
        const random = Math.random().toString(36).substring(2, 8).toUpperCase();
        const museumPrefix = appointmentData.museum === 'main' ? 'SM' : 'QH'; // SM for Shaanxi Museum, QH for Qin & Han
        const bookingReference = `${museumPrefix}${timestamp.slice(-6)}${random}`;

        // Create new appointment
        const appointment = new Appointment({
            ...appointmentData,
            ticketValidDate: ticketValidDate,
            bookingReference: bookingReference,
            status: 'confirmed', // Admin-created appointments are automatically confirmed
            paymentStatus: 'paid' // Admin bookings are considered paid
        });

        console.log('Creating appointment:', {
            visitorName: appointmentData.visitorName,
            bookingReference: bookingReference,
            status: 'confirmed',
            museum: appointmentData.museum,
            visitDate: appointmentData.visitDate
        });

        await appointment.save();

        console.log('Appointment saved successfully with ID:', appointment._id);

        res.status(201).json({
            success: true,
            message: 'Appointment created successfully',
            data: appointment
        });
    } catch (error) {
        console.error('Create appointment error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

export const getAppointments = async (req: AuthRequest, res: Response) => {
    try {
        const { page = 1, limit = 10, status, museum, date, search } = req.query;
        const query: any = {}; // Admin can see all appointments

        if (status) query.status = status;
        if (museum) query.museum = museum;
        if (search) {
            query.$or = [
                { visitorName: { $regex: search, $options: 'i' } },
                { visitorEmail: { $regex: search, $options: 'i' } },
                { visitorPhone: { $regex: search, $options: 'i' } },
                { idNumber: { $regex: search, $options: 'i' } },
                { bookingReference: { $regex: search, $options: 'i' } }
            ];
        }
        if (date) {
            const startDate = new Date(date as string);
            const endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() + 1);
            query.visitDate = { $gte: startDate, $lt: endDate };
        }

        const appointments = await Appointment.find(query)
            .sort({ createdAt: -1 })
            .limit(Number(limit) * 1)
            .skip((Number(page) - 1) * Number(limit));

        const total = await Appointment.countDocuments(query);

        res.json({
            success: true,
            data: {
                appointments,
                pagination: {
                    current: Number(page),
                    pages: Math.ceil(total / Number(limit)),
                    total
                }
            }
        });
    } catch (error) {
        console.error('Get appointments error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

export const getAppointmentById = async (req: AuthRequest, res: Response) => {
    try {
        const appointment = await Appointment.findById(req.params.id);

        if (!appointment) {
            return res.status(404).json({
                success: false,
                message: 'Appointment not found'
            });
        }

        res.json({
            success: true,
            data: appointment
        });
    } catch (error) {
        console.error('Get appointment error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

export const updateAppointment = async (req: AuthRequest, res: Response) => {
    try {
        const appointment = await Appointment.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );

        if (!appointment) {
            return res.status(404).json({
                success: false,
                message: 'Appointment not found'
            });
        }

        res.json({
            success: true,
            message: 'Appointment updated successfully',
            data: appointment
        });
    } catch (error) {
        console.error('Update appointment error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

export const cancelAppointment = async (req: AuthRequest, res: Response) => {
    try {
        const appointment = await Appointment.findByIdAndUpdate(
            req.params.id,
            { status: 'cancelled' },
            { new: true }
        );

        if (!appointment) {
            return res.status(404).json({
                success: false,
                message: 'Appointment not found'
            });
        }

        res.json({
            success: true,
            message: 'Appointment cancelled successfully',
            data: appointment
        });
    } catch (error) {
        console.error('Cancel appointment error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

export const getAvailableTimeSlots = async (req: Request, res: Response) => {
    try {
        const { museum, date } = req.query;

        if (!museum || !date) {
            return res.status(400).json({
                success: false,
                message: 'Museum and date are required'
            });
        }

        const museumConfig = await MuseumConfig.findOne({ museum });
        if (!museumConfig) {
            return res.status(404).json({
                success: false,
                message: 'Museum configuration not found'
            });
        }

        // Get current date and check which period we're in
        const currentDate = new Date();
        const visitDate = new Date(date as string);
        const currentMonthDay = `${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
        const visitMonthDay = `${String(visitDate.getMonth() + 1).padStart(2, '0')}-${String(visitDate.getDate()).padStart(2, '0')}`;

        let timeSlots = museumConfig.regularTimeSlots;
        let dailyCapacity = museumConfig.maxDailyCapacity;

        // Check for special period first (October 1-8) - highest priority
        // Special period: 17,500 capacity with extended hours (7:30-19:30)
        if (museumConfig.specialPeriod &&
            visitMonthDay >= museumConfig.specialPeriod.start &&
            visitMonthDay <= museumConfig.specialPeriod.end) {
            timeSlots = museumConfig.specialPeriodTimeSlots || museumConfig.regularTimeSlots;
            dailyCapacity = museumConfig.specialPeriodCapacity || museumConfig.maxDailyCapacity;
            console.log(`Special period (Oct 1-8): Using ${dailyCapacity} capacity with extended hours`);
        }
        // Check for extended period (April 1 - October 31)
        // Extended period: 14,000 capacity with regular hours
        else if (museumConfig.extendedPeriod &&
            visitMonthDay >= museumConfig.extendedPeriod.start &&
            visitMonthDay <= museumConfig.extendedPeriod.end) {
            timeSlots = museumConfig.extendedTimeSlots || museumConfig.regularTimeSlots;
            dailyCapacity = museumConfig.extendedCapacity || museumConfig.maxDailyCapacity;
            console.log(`Extended period (Apr 1-Oct 31): Using ${dailyCapacity} capacity`);
        }
        // Regular period: 12,000 capacity
        else {
            console.log(`Regular period: Using ${dailyCapacity} capacity`);
        }

        // Get existing appointments for the date to check availability
        const existingAppointments = await Appointment.find({
            museum,
            visitDate: {
                $gte: new Date(visitDate.setHours(0, 0, 0, 0)),
                $lt: new Date(visitDate.setHours(23, 59, 59, 999))
            },
            status: { $in: ['pending', 'confirmed'] }
        });

        // Calculate available slots using correct capacity
        const availableSlots = timeSlots.map(slot => {
            const slotAppointments = existingAppointments.filter(apt => apt.timeSlot === slot);
            const totalBooked = slotAppointments.reduce((sum, apt) => sum + apt.numberOfVisitors, 0);

            return {
                timeSlot: slot,
                available: Math.max(0, dailyCapacity - totalBooked),
                total: dailyCapacity,
                booked: totalBooked
            };
        });

        res.json({
            success: true,
            data: {
                museum: museumConfig.name,
                date: visitDate,
                timeSlots: availableSlots
            }
        });
    } catch (error) {
        console.error('Get time slots error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

export const getMuseumConfigs = async (req: Request, res: Response) => {
    try {
        const configs = await MuseumConfig.find({ isActive: true });

        res.json({
            success: true,
            data: configs
        });
    } catch (error) {
        console.error('Get museum configs error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};
