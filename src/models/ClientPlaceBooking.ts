import mongoose, { Document, Schema } from 'mongoose';

export interface IClientPlaceBooking extends Document {
    // Our system booking reference
    bookingId: string;
    museumBookingId: string;
    confirmationCode: string;
    
    // Visitor information
    visitorName: string;
    idNumber: string;
    idType: string;
    
    // Booking details
    museum: string;
    visitDate: Date;
    timeSlot: string;
    numberOfVisitors: number;
    
    // Client place status
    clientPlaceStatus: 'pending' | 'confirmed' | 'failed' | 'verified';
    clientPlaceResponse?: any;
    
    // Museum platform details
    museumPlatform: string;
    museumUrl: string;
    museumResponse?: any;
    
    // Verification details
    verifiedAt?: Date;
    verificationAttempts: number;
    lastVerificationAttempt?: Date;
    
    // Timestamps
    createdAt: Date;
    updatedAt: Date;
}

const ClientPlaceBookingSchema = new Schema<IClientPlaceBooking>({
    bookingId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    museumBookingId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    confirmationCode: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    visitorName: {
        type: String,
        required: true
    },
    idNumber: {
        type: String,
        required: true,
        index: true
    },
    idType: {
        type: String,
        required: true
    },
    museum: {
        type: String,
        required: true,
        enum: ['main', 'qin_han']
    },
    visitDate: {
        type: Date,
        required: true,
        index: true
    },
    timeSlot: {
        type: String,
        required: true
    },
    numberOfVisitors: {
        type: Number,
        required: true,
        min: 1,
        max: 5
    },
    clientPlaceStatus: {
        type: String,
        required: true,
        enum: ['pending', 'confirmed', 'failed', 'verified'],
        default: 'pending',
        index: true
    },
    clientPlaceResponse: {
        type: Schema.Types.Mixed
    },
    museumPlatform: {
        type: String,
        required: true,
        default: 'ticket.sxhm.com'
    },
    museumUrl: {
        type: String,
        required: true,
        default: 'https://ticket.sxhm.com/quickticket/index.html#/'
    },
    museumResponse: {
        type: Schema.Types.Mixed
    },
    verifiedAt: {
        type: Date
    },
    verificationAttempts: {
        type: Number,
        default: 0
    },
    lastVerificationAttempt: {
        type: Date
    }
}, {
    timestamps: true
});

// Indexes for better performance
ClientPlaceBookingSchema.index({ bookingId: 1 });
ClientPlaceBookingSchema.index({ museumBookingId: 1 });
ClientPlaceBookingSchema.index({ idNumber: 1, visitDate: 1 });
ClientPlaceBookingSchema.index({ clientPlaceStatus: 1 });
ClientPlaceBookingSchema.index({ createdAt: -1 });

export const ClientPlaceBooking = mongoose.model<IClientPlaceBooking>('ClientPlaceBooking', ClientPlaceBookingSchema);
