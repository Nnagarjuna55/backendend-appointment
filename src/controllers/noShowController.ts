import { Request, Response } from 'express';
import NoShowPenalty from '../models/NoShowPenalty';
import Appointment from '../models/Appointment';
import { AuthRequest } from '../middleware/auth';

export const createNoShowPenalty = async (req: AuthRequest, res: Response) => {
    try {
        const { idNumber, idType, reason, appointmentId } = req.body;

        // Check if penalty already exists and is active
        const existingPenalty = await NoShowPenalty.findOne({
            idNumber,
            isActive: true,
            penaltyEndDate: { $gt: new Date() }
        });

        if (existingPenalty) {
            return res.status(400).json({
                success: false,
                message: 'This ID number is already under penalty'
            });
        }

        // Create 180-day penalty
        const penaltyStartDate = new Date();
        const penaltyEndDate = new Date();
        penaltyEndDate.setDate(penaltyEndDate.getDate() + 180);

        const penalty = new NoShowPenalty({
            idNumber,
            idType,
            penaltyStartDate,
            penaltyEndDate,
            reason,
            appointmentId,
            isActive: true
        });

        await penalty.save();

        res.status(201).json({
            success: true,
            message: 'No-show penalty created successfully',
            data: penalty
        });
    } catch (error) {
        console.error('Create no-show penalty error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

export const checkPenaltyStatus = async (req: Request, res: Response) => {
    try {
        const { idNumber } = req.params;

        const activePenalty = await NoShowPenalty.findOne({
            idNumber,
            isActive: true,
            penaltyEndDate: { $gt: new Date() }
        });

        if (activePenalty) {
            return res.json({
                success: true,
                hasPenalty: true,
                data: {
                    penaltyStartDate: activePenalty.penaltyStartDate,
                    penaltyEndDate: activePenalty.penaltyEndDate,
                    reason: activePenalty.reason,
                    daysRemaining: Math.ceil((activePenalty.penaltyEndDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
                }
            });
        }

        res.json({
            success: true,
            hasPenalty: false,
            message: 'No active penalty found'
        });
    } catch (error) {
        console.error('Check penalty status error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

export const getPenalties = async (req: AuthRequest, res: Response) => {
    try {
        const { page = 1, limit = 10, isActive } = req.query;

        const query: any = {};
        if (isActive !== undefined) {
            query.isActive = isActive === 'true';
        }

        const penalties = await NoShowPenalty.find(query)
            .sort({ createdAt: -1 })
            .limit(Number(limit) * 1)
            .skip((Number(page) - 1) * Number(limit));

        const total = await NoShowPenalty.countDocuments(query);

        res.json({
            success: true,
            data: {
                penalties,
                total,
                page: Number(page),
                pages: Math.ceil(total / Number(limit))
            }
        });
    } catch (error) {
        console.error('Get penalties error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

export const removePenalty = async (req: AuthRequest, res: Response) => {
    try {
        const { penaltyId } = req.params;

        const penalty = await NoShowPenalty.findById(penaltyId);
        if (!penalty) {
            return res.status(404).json({
                success: false,
                message: 'Penalty not found'
            });
        }

        penalty.isActive = false;
        await penalty.save();

        res.json({
            success: true,
            message: 'Penalty removed successfully'
        });
    } catch (error) {
        console.error('Remove penalty error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};
