import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import Appointment from '../models/Appointment';
import MuseumConfig from '../models/MuseumConfig';
import User from '../models/User';
import { AuthRequest } from '../middleware/auth';
import { clearExpiredPlans, clearExpiredAppointments } from '../services/autoClearService';

export const getDashboardStats = async (req: AuthRequest, res: Response) => {
    try {
        console.log('=== GETTING DASHBOARD STATS ===');

        // Get all appointments first to debug
        const allAppointments = await Appointment.find({}).select('status museum visitDate createdAt visitorName');
        console.log('All appointments in database:', allAppointments.length);
        allAppointments.forEach((apt, i) => {
            console.log(`${i + 1}. ${apt.visitorName} - Status: ${apt.status} - Museum: ${apt.museum} - Visit: ${apt.visitDate}`);
        });

        if (allAppointments.length === 0) {
            console.log('No appointments found in database');
            return res.json({
                success: true,
                data: {
                    totalAppointments: 0,
                    todayAppointments: 0,
                    upcomingAppointments: 0,
                    statusBreakdown: { pending: 0, confirmed: 0, cancelled: 0 },
                    museumBreakdown: { main: 0, qinHan: 0 }
                }
            });
        }

        // Calculate stats from the actual data
        const totalAppointments = allAppointments.length;

        const today = new Date();
        const startOfDay = new Date(today);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(today);
        endOfDay.setHours(23, 59, 59, 999);

        const todayAppointments = allAppointments.filter(apt => {
            const visitDate = new Date(apt.visitDate);
            return visitDate >= startOfDay && visitDate <= endOfDay;
        }).length;

        const now = new Date();
        const upcomingAppointments = allAppointments.filter(apt => {
            const visitDate = new Date(apt.visitDate);
            return visitDate >= now && (apt.status === 'pending' || apt.status === 'confirmed');
        }).length;

        const pendingAppointments = allAppointments.filter(apt => apt.status === 'pending').length;
        const confirmedAppointments = allAppointments.filter(apt => apt.status === 'confirmed').length;
        const cancelledAppointments = allAppointments.filter(apt => apt.status === 'cancelled').length;

        const mainMuseumAppointments = allAppointments.filter(apt => apt.museum === 'main').length;
        const qinHanMuseumAppointments = allAppointments.filter(apt => apt.museum === 'qin_han').length;

        const statsData = {
            totalAppointments,
            todayAppointments,
            upcomingAppointments,
            statusBreakdown: {
                pending: pendingAppointments,
                confirmed: confirmedAppointments,
                cancelled: cancelledAppointments
            },
            museumBreakdown: {
                main: mainMuseumAppointments,
                qin_han: qinHanMuseumAppointments
            }
        };

        console.log('=== CALCULATED STATS ===');
        console.log('Total:', totalAppointments);
        console.log('Today:', todayAppointments);
        console.log('Upcoming:', upcomingAppointments);
        console.log('Pending:', pendingAppointments);
        console.log('Confirmed:', confirmedAppointments);
        console.log('Main Museum:', mainMuseumAppointments);
        console.log('Qin & Han:', qinHanMuseumAppointments);

        res.json({
            success: true,
            data: statsData
        });
    } catch (error) {
        console.error('Dashboard stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

export const getAppointmentsCount = async (req: AuthRequest, res: Response) => {
    try {
        console.log('Getting appointments count...');

        const total = await Appointment.countDocuments({});
        console.log('Total count from database:', total);

        const recent = await Appointment.find({}).sort({ createdAt: -1 }).limit(3);
        console.log('Recent appointments:', recent.length);

        // Let's also check all appointments
        const allAppointments = await Appointment.find({}).select('visitorName status museum visitDate createdAt');
        console.log('All appointments in database:', allAppointments);

        res.json({
            success: true,
            data: {
                total,
                recent: recent.map(apt => ({
                    id: apt._id,
                    visitorName: apt.visitorName,
                    bookingReference: apt.bookingReference,
                    status: apt.status,
                    museum: apt.museum,
                    createdAt: apt.createdAt
                })),
                allAppointments: allAppointments
            }
        });
    } catch (error) {
        console.error('Get appointments count error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

export const getAllAppointments = async (req: AuthRequest, res: Response) => {
    try {
        console.log('=== GET ALL APPOINTMENTS ===');
        const { page = 1, limit = 20, status, museum, date, search } = req.query;
        console.log('Query params:', { page, limit, status, museum, date, search });

        const query: any = {};

        // Add filters only if they are provided
        if (status && status !== '') query.status = status;
        if (museum && museum !== '') query.museum = museum;
        if (date && date !== '') {
            const startDate = new Date(date as string);
            const endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() + 1);
            query.visitDate = { $gte: startDate, $lt: endDate };
        }
        if (search && search !== '') {
            query.$or = [
                { visitorName: { $regex: search, $options: 'i' } },
                { visitorEmail: { $regex: search, $options: 'i' } },
                { visitorPhone: { $regex: search, $options: 'i' } },
                { idNumber: { $regex: search, $options: 'i' } },
                { bookingReference: { $regex: search, $options: 'i' } }
            ];
        }

        console.log('MongoDB query:', query);

        const appointments = await Appointment.find(query)
            .sort({ createdAt: -1 })
            .limit(Number(limit) * 1)
            .skip((Number(page) - 1) * Number(limit));

        const total = await Appointment.countDocuments(query);

        console.log(`Found ${appointments.length} appointments out of ${total} total`);
        appointments.forEach((apt, i) => {
            console.log(`${i + 1}. ${apt.visitorName} - ${apt.status} - ${apt.museum} - ${apt.bookingReference}`);
        });

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
        console.error('Get all appointments error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

export const updateAppointmentStatus = async (req: AuthRequest, res: Response) => {
    try {
        const { status } = req.body;
        const validStatuses = ['pending', 'confirmed', 'cancelled', 'completed'];

        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status'
            });
        }

        const appointment = await Appointment.findByIdAndUpdate(
            req.params.id,
            { status },
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
            message: 'Appointment status updated successfully',
            data: appointment
        });
    } catch (error) {
        console.error('Update appointment status error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

export const confirmAllPendingAppointments = async (req: AuthRequest, res: Response) => {
    try {
        console.log('=== CONFIRMING ALL PENDING APPOINTMENTS ===');

        // First check what pending appointments exist
        const pendingAppointments = await Appointment.find({ status: 'pending' });
        console.log('Found pending appointments:', pendingAppointments.length);
        pendingAppointments.forEach((apt, i) => {
            console.log(`${i + 1}. ${apt.visitorName} - ${apt.bookingReference} - Status: ${apt.status}`);
        });

        // Update all pending appointments to confirmed (for admin-created appointments)
        const result = await Appointment.updateMany(
            { status: 'pending' },
            {
                status: 'confirmed',
                paymentStatus: 'paid' // Admin bookings are considered paid
            }
        );

        console.log(`Updated ${result.modifiedCount} pending appointments to confirmed`);

        // Verify the update
        const confirmedAppointments = await Appointment.find({ status: 'confirmed' });
        console.log('Total confirmed appointments after update:', confirmedAppointments.length);

        res.json({
            success: true,
            message: `Successfully confirmed ${result.modifiedCount} pending appointments`,
            data: {
                modifiedCount: result.modifiedCount,
                totalConfirmed: confirmedAppointments.length
            }
        });
    } catch (error) {
        console.error('Confirm all pending appointments error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

export const systemHealthCheck = async (req: AuthRequest, res: Response) => {
    try {
        console.log('=== SYSTEM HEALTH CHECK ===');

        // Check database connection
        const dbStats = {
            totalAppointments: await Appointment.countDocuments(),
            totalUsers: await User.countDocuments(),
            totalMuseumConfigs: await MuseumConfig.countDocuments()
        };

        // Get sample data
        const sampleAppointments = await Appointment.find({}).limit(3).select('visitorName status museum visitDate');
        const sampleUsers = await User.find({}).limit(3).select('email role');

        console.log('Database stats:', dbStats);
        console.log('Sample appointments:', sampleAppointments);
        console.log('Sample users:', sampleUsers);

        res.json({
            success: true,
            data: {
                timestamp: new Date().toISOString(),
                database: {
                    connected: true,
                    stats: dbStats
                },
                samples: {
                    appointments: sampleAppointments,
                    users: sampleUsers
                }
            }
        });
    } catch (error) {
        console.error('System health check error:', error);
        res.status(500).json({
            success: false,
            message: 'System health check failed',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};

export const manualClearExpiredAppointments = async (req: AuthRequest, res: Response) => {
    try {
        console.log('=== MANUAL CLEAR EXPIRED APPOINTMENTS ===');

        const result = await clearExpiredAppointments();

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('Manual clear expired appointments error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to clear expired appointments',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};

export const getMuseumConfigs = async (req: AuthRequest, res: Response) => {
    try {
        const configs = await MuseumConfig.find();

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

export const createMuseumConfig = async (req: AuthRequest, res: Response) => {
    try {
        const config = new MuseumConfig(req.body);
        await config.save();

        res.status(201).json({
            success: true,
            message: 'Museum configuration created successfully',
            data: config
        });
    } catch (error) {
        console.error('Create museum config error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

export const updateMuseumConfig = async (req: AuthRequest, res: Response) => {
    try {
        const config = await MuseumConfig.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );

        if (!config) {
            return res.status(404).json({
                success: false,
                message: 'Museum configuration not found'
            });
        }

        res.json({
            success: true,
            message: 'Museum configuration updated successfully',
            data: config
        });
    } catch (error) {
        console.error('Update museum config error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

export const getUsers = async (req: AuthRequest, res: Response) => {
    try {
        const { page = 1, limit = 20, role, search } = req.query;
        const query: any = {};

        if (role) query.role = role;
        if (search) {
            query.email = { $regex: search, $options: 'i' };
        }

        const users = await User.find(query)
            .select('-password')
            .sort({ createdAt: -1 })
            .limit(Number(limit) * 1)
            .skip((Number(page) - 1) * Number(limit));

        const total = await User.countDocuments(query);

        res.json({
            success: true,
            data: {
                users,
                pagination: {
                    current: Number(page),
                    pages: Math.ceil(total / Number(limit)),
                    total
                }
            }
        });
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

export const createUser = async (req: AuthRequest, res: Response) => {
    try {
        const { email, password, role = 'user' } = req.body;

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'User already exists with this email'
            });
        }

        const user = new User({ email, password, role });
        await user.save();

        res.status(201).json({
            success: true,
            message: 'User created successfully',
            data: {
                id: user._id,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Create user error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

export const updateUser = async (req: AuthRequest, res: Response) => {
    try {
        const { email, role, isActive } = req.body;
        const updateData: any = {};

        if (email) updateData.email = email;
        if (role) updateData.role = role;
        if (typeof isActive === 'boolean') updateData.isActive = isActive;

        const user = await User.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true, runValidators: true }
        ).select('-password');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            message: 'User updated successfully',
            data: user
        });
    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

export const deleteUser = async (req: AuthRequest, res: Response) => {
    try {
        const user = await User.findByIdAndDelete(req.params.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            message: 'User deleted successfully'
        });
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};
