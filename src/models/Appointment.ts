import mongoose, { Document, Schema } from 'mongoose';

export interface IAppointment extends Document {
    visitorName: string;
    visitorEmail?: string;
    visitorPhone?: string;
    idNumber: string;
    idType: 'passport' | 'id_card' | 'hk_macau_passport' | 'taiwan_permit' | 'foreign_id';
    museum: 'main' | 'qin_han';
    visitDate: Date;
    timeSlot: string;
    numberOfVisitors: number;
    visitorDetails: {
        name: string;
        idNumber: string;
        idType: string;
        age?: number;
    }[];
    status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
    bookingReference: string;
    totalAmount: number;
    paymentStatus: 'pending' | 'paid' | 'refunded';
    ticketValidDate: Date;
    entryTime?: Date;
    isUsed: boolean;
    notes?: string;
    createdAt: Date;
    updatedAt: Date;
}

const appointmentSchema = new Schema<IAppointment>({
    visitorName: {
        type: String,
        required: [true, 'Visitor name is required'],
        trim: true
    },
    visitorEmail: {
        type: String,
        required: false,
        trim: true,
        lowercase: true
    },
    visitorPhone: {
        type: String,
        required: false,
        trim: true
    },
    idNumber: {
        type: String,
        required: [true, 'ID number is required'],
        trim: true
    },
    idType: {
        type: String,
        enum: ['passport', 'id_card', 'hk_macau_passport', 'taiwan_permit', 'foreign_id'],
        required: [true, 'ID type is required']
    },
    museum: {
        type: String,
        enum: ['main', 'qin_han'],
        required: [true, 'Museum selection is required']
    },
    visitDate: {
        type: Date,
        required: [true, 'Visit date is required']
    },
    timeSlot: {
        type: String,
        required: [true, 'Time slot is required']
    },
    numberOfVisitors: {
        type: Number,
        required: [true, 'Number of visitors is required'],
        min: 1,
        max: 5
    },
    visitorDetails: [{
        name: {
            type: String,
            required: true,
            trim: true
        },
        idNumber: {
            type: String,
            required: true,
            trim: true
        },
        idType: {
            type: String,
            required: true
        },
        age: {
            type: Number,
            min: 0,
            max: 120
        }
    }],
    status: {
        type: String,
        enum: ['pending', 'confirmed', 'cancelled', 'completed'],
        default: 'pending'
    },
    bookingReference: {
        type: String,
        required: true,
        unique: true
    },
    totalAmount: {
        type: Number,
        default: 0
    },
    paymentStatus: {
        type: String,
        enum: ['pending', 'paid', 'refunded'],
        default: 'pending'
    },
    ticketValidDate: {
        type: Date,
        required: true
    },
    entryTime: {
        type: Date,
        required: false
    },
    isUsed: {
        type: Boolean,
        default: false
    },
    notes: {
        type: String,
        trim: true
    }
}, {
    timestamps: true
});

// Generate booking reference before saving
appointmentSchema.pre('save', function (next) {
    if (!this.bookingReference) {
        const timestamp = Date.now().toString();
        const random = Math.random().toString(36).substring(2, 8).toUpperCase();
        this.bookingReference = `SM${timestamp.slice(-6)}${random}`;
    }
    next();
});

export default mongoose.model<IAppointment>('Appointment', appointmentSchema);
