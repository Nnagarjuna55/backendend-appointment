import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import authRoutes from './routes/auth';
import appointmentRoutes from './routes/appointments';
import adminRoutes from './routes/admin';
import visitPlanRoutes from './routes/visitPlans';
import noShowRoutes from './routes/noShow';
import entryRoutes from './routes/entry';
import { errorHandler } from './middleware/errorHandler';
import { seedDatabase } from './seed';
import { startAutoClearService } from './services/autoClearService';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
// app.use(helmet());
// app.use(cors({
//     origin: process.env.NODE_ENV === 'production'
//         ? ['https://your-frontend-domain.com']
//         : ['http://localhost:3000'],
//     credentials: true
// }));
app.use(helmet());
app.use(cors({
    origin: process.env.NODE_ENV === 'production'
        ? ['https://mern-booking-app-eabzagh0g2cvenar.canadacentral-01.azurewebsites.net']
        : ['http://localhost:3000'],
    credentials: true
}));
// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/visit-plans', visitPlanRoutes);
app.use('/api/no-show', noShowRoutes);
app.use('/api/entry', entryRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({ message: 'Route not found' });
});

// Database connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/shaanxi-museum')
    .then(async () => {
        console.log('Connected to MongoDB');

        // Seed database with initial data
        await seedDatabase();

        // Start auto-clear service
        startAutoClearService();

        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
            console.log(`API available at http://localhost:${PORT}/api`);
        });
    })
    .catch((error) => {
        console.error('MongoDB connection error:', error);
        process.exit(1);
    });

export default app;
