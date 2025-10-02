import mongoose, { Document, Schema } from 'mongoose';

export interface IVisitPlan extends Document {
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
    status: 'draft' | 'converted' | 'expired';
    convertedToAppointment?: string; // Reference to appointment ID
    expiresAt: Date; // Auto-clear at 24:00
    createdAt: Date;
    updatedAt: Date;
}

const visitPlanSchema = new Schema<IVisitPlan>({
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
        enum: ['draft', 'converted', 'expired'],
        default: 'draft'
    },
    convertedToAppointment: {
        type: String,
        required: false
    },
    expiresAt: {
        type: Date,
        required: true,
        default: () => {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(0, 0, 0, 0);
            return tomorrow;
        }
    }
}, {
    timestamps: true
});

// Index for efficient queries
visitPlanSchema.index({ expiresAt: 1 });
visitPlanSchema.index({ status: 1 });
visitPlanSchema.index({ idNumber: 1, visitDate: 1 });

export default mongoose.model<IVisitPlan>('VisitPlan', visitPlanSchema);
