import cron from 'node-cron';
import VisitPlan from '../models/VisitPlan';
import Appointment from '../models/Appointment';
import NoShowPenalty from '../models/NoShowPenalty';

export const startAutoClearService = () => {
    // Run every day at 24:00 (midnight) to clear expired visit plans
    cron.schedule('0 0 * * *', async () => {
        try {
            console.log('Starting auto-clear service at midnight...');

            // Find all expired visit plans that haven't been converted to reservations
            const expiredPlans = await VisitPlan.find({
                status: 'draft',
                expiresAt: { $lte: new Date() }
            });

            if (expiredPlans.length > 0) {
                // Mark as expired - "remaining visit plan will be converted into visit orders every day 24:00 Auto clear"
                await VisitPlan.updateMany(
                    { _id: { $in: expiredPlans.map(plan => plan._id) } },
                    { status: 'expired' }
                );

                console.log(`Auto-cleared ${expiredPlans.length} expired visit plans at midnight`);
            } else {
                console.log('No expired visit plans to clear at midnight');
            }

            // Auto-clear expired appointments (24 hours after visit date)
            const now = new Date();
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            yesterday.setHours(23, 59, 59, 999); // End of yesterday

            console.log('Checking for expired appointments...');

            // Find appointments that are past their visit date and haven't been used
            const expiredAppointments = await Appointment.find({
                visitDate: { $lt: yesterday },
                status: { $in: ['confirmed', 'pending'] },
                isUsed: false
            });

            if (expiredAppointments.length > 0) {
                // Mark expired appointments as 'completed' (expired)
                await Appointment.updateMany(
                    {
                        _id: { $in: expiredAppointments.map(apt => apt._id) },
                        isUsed: false
                    },
                    {
                        status: 'completed',
                        notes: 'Auto-expired after 24 hours'
                    }
                );

                console.log(`Auto-expired ${expiredAppointments.length} appointments after 24 hours`);
            }

            // Check for no-show appointments (confirmed appointments from yesterday that weren't used)
            const yesterdayStart = new Date();
            yesterdayStart.setDate(yesterdayStart.getDate() - 1);
            yesterdayStart.setHours(0, 0, 0, 0);

            const yesterdayEnd = new Date();
            yesterdayEnd.setDate(yesterdayEnd.getDate() - 1);
            yesterdayEnd.setHours(23, 59, 59, 999);

            const noShowAppointments = await Appointment.find({
                visitDate: {
                    $gte: yesterdayStart,
                    $lte: yesterdayEnd
                },
                status: 'confirmed',
                isUsed: false
            });

            // Create penalties for no-shows
            for (const appointment of noShowAppointments) {
                const existingPenalty = await NoShowPenalty.findOne({
                    idNumber: appointment.idNumber,
                    isActive: true
                });

                if (!existingPenalty) {
                    const penaltyEndDate = new Date();
                    penaltyEndDate.setDate(penaltyEndDate.getDate() + 180);

                    await NoShowPenalty.create({
                        idNumber: appointment.idNumber,
                        idType: appointment.idType,
                        penaltyStartDate: new Date(),
                        penaltyEndDate: penaltyEndDate,
                        reason: 'no_show',
                        appointmentId: (appointment._id as any).toString(),
                        isActive: true
                    });

                    console.log(`Created 180-day penalty for no-show: ${appointment.idNumber}`);
                }
            }

        } catch (error) {
            console.error('Auto-clear service error:', error);
        }
    });

    console.log('Auto-clear service started - will run daily at midnight (24:00)');
};

export const clearExpiredPlans = async () => {
    try {
        const expiredPlans = await VisitPlan.find({
            status: 'draft',
            expiresAt: { $lte: new Date() }
        });

        if (expiredPlans.length > 0) {
            await VisitPlan.updateMany(
                { _id: { $in: expiredPlans.map(plan => plan._id) } },
                { status: 'expired' }
            );

            return {
                success: true,
                cleared: expiredPlans.length,
                message: `Cleared ${expiredPlans.length} expired visit plans`
            };
        }

        return {
            success: true,
            cleared: 0,
            message: 'No expired visit plans to clear'
        };
    } catch (error) {
        console.error('Clear expired plans error:', error);
        return {
            success: false,
            error: (error as Error).message
        };
    }
};

export const clearExpiredAppointments = async () => {
    try {
        console.log('Manual clear: Checking for expired appointments...');

        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        yesterday.setHours(23, 59, 59, 999);

        // Find appointments that are past their visit date and haven't been used
        const expiredAppointments = await Appointment.find({
            visitDate: { $lt: yesterday },
            status: { $in: ['confirmed', 'pending'] },
            isUsed: false
        });

        console.log(`Found ${expiredAppointments.length} expired appointments`);

        if (expiredAppointments.length > 0) {
            // Mark expired appointments as 'completed' (expired)
            await Appointment.updateMany(
                {
                    _id: { $in: expiredAppointments.map(apt => apt._id) },
                    isUsed: false
                },
                {
                    status: 'completed',
                    notes: 'Auto-expired after 24 hours'
                }
            );

            return {
                success: true,
                cleared: expiredAppointments.length,
                message: `Cleared ${expiredAppointments.length} expired appointments`,
                appointments: expiredAppointments.map(apt => ({
                    id: apt._id,
                    visitorName: apt.visitorName,
                    visitDate: apt.visitDate,
                    status: apt.status
                }))
            };
        }

        return {
            success: true,
            cleared: 0,
            message: 'No expired appointments to clear'
        };
    } catch (error) {
        console.error('Clear expired appointments error:', error);
        return {
            success: false,
            error: (error as Error).message
        };
    }
};
