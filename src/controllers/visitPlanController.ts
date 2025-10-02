import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import VisitPlan from '../models/VisitPlan';
import Appointment from '../models/Appointment';
import MuseumConfig from '../models/MuseumConfig';
import { AuthRequest } from '../middleware/auth';

export const createVisitPlan = async (req: AuthRequest, res: Response) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const visitPlanData = req.body;

        // Check if visit plan already exists for this ID number on the same date
        const existingPlan = await VisitPlan.findOne({
            idNumber: visitPlanData.idNumber,
            visitDate: new Date(visitPlanData.visitDate),
            status: { $in: ['draft', 'converted'] }
        });

        if (existingPlan) {
            return res.status(400).json({
                success: false,
                message: 'A visit plan already exists for this ID number on the selected date'
            });
        }

        // Create new visit plan
        const visitPlan = new VisitPlan(visitPlanData);
        await visitPlan.save();

        res.status(201).json({
            success: true,
            message: 'Visit plan created successfully',
            data: visitPlan
        });
    } catch (error) {
        console.error('Create visit plan error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

export const getVisitPlans = async (req: AuthRequest, res: Response) => {
    try {
        const { status, page = 1, limit = 10 } = req.query;

        const query: any = {};
        if (status) {
            query.status = status;
        }

        const visitPlans = await VisitPlan.find(query)
            .sort({ createdAt: -1 })
            .limit(Number(limit) * 1)
            .skip((Number(page) - 1) * Number(limit));

        const total = await VisitPlan.countDocuments(query);

        res.json({
            success: true,
            data: {
                visitPlans,
                total,
                page: Number(page),
                pages: Math.ceil(total / Number(limit))
            }
        });
    } catch (error) {
        console.error('Get visit plans error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

export const convertToAppointment = async (req: AuthRequest, res: Response) => {
    try {
        const { planId } = req.params;

        const visitPlan = await VisitPlan.findById(planId);
        if (!visitPlan) {
            return res.status(404).json({
                success: false,
                message: 'Visit plan not found'
            });
        }

        if (visitPlan.status !== 'draft') {
            return res.status(400).json({
                success: false,
                message: 'Visit plan has already been processed'
            });
        }

        // Check ticket release time validation
        const museumConfig = await MuseumConfig.findOne({ museum: visitPlan.museum });
        if (!museumConfig) {
            return res.status(400).json({
                success: false,
                message: 'Museum configuration not found'
            });
        }

        const now = new Date();
        const currentTime = now.getHours() * 60 + now.getMinutes();
        const releaseTime = museumConfig.ticketReleaseTime.split(':');
        const releaseTimeMinutes = parseInt(releaseTime[0]) * 60 + parseInt(releaseTime[1]);

        // Check if current time is before ticket release time
        if (currentTime < releaseTimeMinutes) {
            return res.status(400).json({
                success: false,
                message: `Tickets are only available after ${museumConfig.ticketReleaseTime}`
            });
        }

        // Check if appointment already exists for this ID number on the same date
        const existingAppointment = await Appointment.findOne({
            idNumber: visitPlan.idNumber,
            visitDate: visitPlan.visitDate,
            status: { $in: ['pending', 'confirmed'] }
        });

        if (existingAppointment) {
            return res.status(400).json({
                success: false,
                message: 'An appointment already exists for this ID number on the selected date'
            });
        }

        // Create appointment from visit plan
        const appointmentData = {
            visitorName: visitPlan.visitorName,
            visitorEmail: visitPlan.visitorEmail,
            visitorPhone: visitPlan.visitorPhone,
            idNumber: visitPlan.idNumber,
            idType: visitPlan.idType,
            museum: visitPlan.museum,
            visitDate: visitPlan.visitDate,
            timeSlot: visitPlan.timeSlot,
            numberOfVisitors: visitPlan.numberOfVisitors,
            visitorDetails: visitPlan.visitorDetails,
            bookingReference: `SM${Date.now()}${Math.random().toString(36).substr(2, 4).toUpperCase()}`
        };

        const appointment = new Appointment(appointmentData);
        await appointment.save();

        // Update visit plan status
        visitPlan.status = 'converted';
        visitPlan.convertedToAppointment = (appointment._id as any).toString();
        await visitPlan.save();

        res.json({
            success: true,
            message: 'Visit plan converted to appointment successfully',
            data: appointment
        });
    } catch (error) {
        console.error('Convert visit plan error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

export const deleteVisitPlan = async (req: AuthRequest, res: Response) => {
    try {
        const { planId } = req.params;

        const visitPlan = await VisitPlan.findById(planId);
        if (!visitPlan) {
            return res.status(404).json({
                success: false,
                message: 'Visit plan not found'
            });
        }

        await VisitPlan.findByIdAndDelete(planId);

        res.json({
            success: true,
            message: 'Visit plan deleted successfully'
        });
    } catch (error) {
        console.error('Delete visit plan error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};
