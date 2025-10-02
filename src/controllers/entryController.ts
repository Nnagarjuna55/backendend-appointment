import { Request, Response } from 'express';
import Appointment from '../models/Appointment';
import MuseumConfig from '../models/MuseumConfig';
import NoShowPenalty from '../models/NoShowPenalty';

export const validateEntry = async (req: Request, res: Response) => {
    try {
        const { bookingReference, idNumber, museum } = req.body;

        // Find appointment
        const appointment = await Appointment.findOne({
            bookingReference,
            idNumber,
            museum,
            status: 'confirmed'
        });

        if (!appointment) {
            return res.status(404).json({
                success: false,
                message: 'Appointment not found or not confirmed'
            });
        }

        // Check if ticket is still valid (same day)
        const now = new Date();
        const visitDate = new Date(appointment.visitDate);
        const isSameDay = now.toDateString() === visitDate.toDateString();

        if (!isSameDay) {
            return res.status(400).json({
                success: false,
                message: 'Ticket is only valid on the visit date'
            });
        }

        // Check if ticket has expired
        if (now > appointment.ticketValidDate) {
            return res.status(400).json({
                success: false,
                message: 'Ticket has expired'
            });
        }

        // Check if already used
        if (appointment.isUsed) {
            return res.status(400).json({
                success: false,
                message: 'Ticket has already been used'
            });
        }

        // Get museum config for time slot validation
        const museumConfig = await MuseumConfig.findOne({ museum: appointment.museum });
        if (!museumConfig) {
            return res.status(400).json({
                success: false,
                message: 'Museum configuration not found'
            });
        }

        // Check if entry is within time slot
        const currentTime = now.getHours() * 60 + now.getMinutes();
        const timeSlot = appointment.timeSlot;
        const [startTime, endTime] = timeSlot.split('-');
        const [startHour, startMin] = startTime.split(':').map(Number);
        const [endHour, endMin] = endTime.split(':').map(Number);

        const slotStartMinutes = startHour * 60 + startMin;
        const slotEndMinutes = endHour * 60 + endMin;

        if (currentTime < slotStartMinutes || currentTime > slotEndMinutes) {
            return res.status(400).json({
                success: false,
                message: `Entry is only allowed during the booked time slot: ${timeSlot}`
            });
        }

        // Check for active penalty
        const activePenalty = await NoShowPenalty.findOne({
            idNumber: appointment.idNumber,
            isActive: true,
            penaltyEndDate: { $gt: now }
        });

        if (activePenalty) {
            return res.status(400).json({
                success: false,
                message: 'This ID number is under penalty and cannot enter'
            });
        }

        // Mark as used and record entry time
        appointment.isUsed = true;
        appointment.entryTime = now;
        await appointment.save();

        res.json({
            success: true,
            message: 'Entry validated successfully',
            data: {
                appointment,
                entryTime: now,
                timeSlot: appointment.timeSlot,
                numberOfVisitors: appointment.numberOfVisitors
            }
        });
    } catch (error) {
        console.error('Validate entry error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

export const getEntryStats = async (req: Request, res: Response) => {
    try {
        const { date, museum } = req.query;

        const query: any = {
            status: 'confirmed',
            isUsed: true
        };

        if (date) {
            const targetDate = new Date(date as string);
            query.visitDate = {
                $gte: new Date(targetDate.setHours(0, 0, 0, 0)),
                $lt: new Date(targetDate.setHours(23, 59, 59, 999))
            };
        }

        if (museum) {
            query.museum = museum;
        }

        const stats = await Appointment.aggregate([
            { $match: query },
            {
                $group: {
                    _id: '$timeSlot',
                    totalEntries: { $sum: 1 },
                    totalVisitors: { $sum: '$numberOfVisitors' }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        console.error('Get entry stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};
