import mongoose from 'mongoose';
import User from './models/User';
import MuseumConfig from './models/MuseumConfig';
import bcrypt from 'bcryptjs';

export const seedDatabase = async () => {
    try {
        // Create admin user
        const adminExists = await User.findOne({ email: 'admin@museum.com' });
        if (!adminExists) {
            const adminUser = new User({
                email: 'admin@museum.com',
                password: 'admin123',
                role: 'admin',
                isActive: true
            });
            await adminUser.save();
            console.log('Admin user created');
        }

        // Create museum configurations using upsert to avoid duplicates
        await MuseumConfig.findOneAndUpdate(
            { museum: 'main' },
            {
                museum: 'main',
                name: 'Shaanxi History Museum',
                address: 'Xiaozhai East Road, Yanta District Number 91',
                maxDailyCapacity: 12000, // Regular capacity
                extendedCapacity: 14000, // April 1 - October 31 (+2000)
                specialPeriodCapacity: 17500, // October 1-8 (+5500 total)
                regularTimeSlots: ['8:30-10:30', '10:30-12:30', '12:30-14:30', '14:30-16:30', '16:30-18:00'],
                extendedTimeSlots: ['8:30-10:30', '10:30-12:30', '12:30-14:30', '14:30-16:30', '16:30-18:00'], // Same as regular
                specialPeriodTimeSlots: ['7:30-9:30', '9:30-11:30', '11:30-13:30', '13:30-15:30', '15:30-17:30', '17:30-19:30'], // Extended hours
                regularPeriod: { start: '01-01', end: '12-31' },
                extendedPeriod: { start: '04-01', end: '10-31' }, // Extended opening period
                specialPeriod: { start: '10-01', end: '10-08' }, // National Holiday period
                bookingAdvanceDays: 5, // 5 days advance booking
                ticketReleaseTime: '17:00', // Daily ticket release at 17:00
                isActive: true
            },
            { upsert: true, new: true }
        );
        console.log('Main museum configuration created/updated');

        await MuseumConfig.findOneAndUpdate(
            { museum: 'qin_han' },
            {
                museum: 'qin_han',
                name: 'Qin & Han Dynasties Museum',
                address: 'East Section of Lanchi 3rd Road, Qin & Han New City, Xi\'an-Xian New Area',
                maxDailyCapacity: 12000, // Same capacity rules as main museum
                extendedCapacity: 14000, // April 1 - October 31
                specialPeriodCapacity: 17500, // October 1-8
                regularTimeSlots: ['8:30-11:30', '11:30-13:00', '13:00-14:30', '14:30-18:00'], // Different time slots
                extendedTimeSlots: ['8:30-11:30', '11:30-13:00', '13:00-14:30', '14:30-18:00'], // Same as regular for Qin & Han
                specialPeriodTimeSlots: ['7:30-9:30', '9:30-11:30', '11:30-13:30', '13:30-15:30', '15:30-17:30', '17:30-19:30'],
                regularPeriod: { start: '01-01', end: '12-31' },
                extendedPeriod: { start: '04-01', end: '10-31' },
                specialPeriod: { start: '10-01', end: '10-08' },
                bookingAdvanceDays: 5, // 5 days advance booking
                ticketReleaseTime: '17:30', // Daily ticket release at 17:30
                isActive: true
            },
            { upsert: true, new: true }
        );
        console.log('Qin & Han museum configuration created/updated');

        console.log('Database seeded successfully');
    } catch (error) {
        console.error('Error seeding database:', error);
    }
};
