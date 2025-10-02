import mongoose, { Document, Schema } from 'mongoose';

export interface IMuseumConfig extends Document {
    museum: 'main' | 'qin_han';
    name: string;
    address: string;
    maxDailyCapacity: number;
    extendedCapacity?: number;
    specialPeriodCapacity?: number;
    regularTimeSlots: string[];
    extendedTimeSlots?: string[];
    specialPeriodTimeSlots?: string[];
    regularPeriod: {
        start: string; // MM-DD format
        end: string; // MM-DD format
    };
    extendedPeriod?: {
        start: string; // MM-DD format
        end: string; // MM-DD format
    };
    specialPeriod?: {
        start: string; // MM-DD format
        end: string; // MM-DD format
    };
    bookingAdvanceDays: number;
    ticketReleaseTime: string; // HH:mm format
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const museumConfigSchema = new Schema<IMuseumConfig>({
    museum: {
        type: String,
        enum: ['main', 'qin_han'],
        required: true,
        unique: true
    },
    name: {
        type: String,
        required: true
    },
    address: {
        type: String,
        required: true
    },
    maxDailyCapacity: {
        type: Number,
        required: true,
        min: 1
    },
    extendedCapacity: {
        type: Number,
        min: 1
    },
    specialPeriodCapacity: {
        type: Number,
        min: 1
    },
    regularTimeSlots: [{
        type: String,
        required: true
    }],
    extendedTimeSlots: [{
        type: String
    }],
    specialPeriodTimeSlots: [{
        type: String
    }],
    regularPeriod: {
        start: {
            type: String,
            required: true
        },
        end: {
            type: String,
            required: true
        }
    },
    extendedPeriod: {
        start: {
            type: String
        },
        end: {
            type: String
        }
    },
    specialPeriod: {
        start: {
            type: String
        },
        end: {
            type: String
        }
    },
    bookingAdvanceDays: {
        type: Number,
        required: true,
        min: 1,
        max: 30
    },
    ticketReleaseTime: {
        type: String,
        required: true
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

export default mongoose.model<IMuseumConfig>('MuseumConfig', museumConfigSchema);
