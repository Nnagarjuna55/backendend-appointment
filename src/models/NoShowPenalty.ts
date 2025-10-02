import mongoose, { Document, Schema } from 'mongoose';

export interface INoShowPenalty extends Document {
    idNumber: string;
    idType: string;
    penaltyStartDate: Date;
    penaltyEndDate: Date;
    reason: 'no_show' | 'late_cancellation' | 'invalid_booking';
    appointmentId?: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const noShowPenaltySchema = new Schema<INoShowPenalty>({
    idNumber: {
        type: String,
        required: [true, 'ID number is required'],
        trim: true
    },
    idType: {
        type: String,
        required: [true, 'ID type is required']
    },
    penaltyStartDate: {
        type: Date,
        required: [true, 'Penalty start date is required']
    },
    penaltyEndDate: {
        type: Date,
        required: [true, 'Penalty end date is required']
    },
    reason: {
        type: String,
        enum: ['no_show', 'late_cancellation', 'invalid_booking'],
        required: [true, 'Penalty reason is required']
    },
    appointmentId: {
        type: String,
        required: false
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Index for efficient queries
noShowPenaltySchema.index({ idNumber: 1, isActive: 1 });
noShowPenaltySchema.index({ penaltyEndDate: 1 });

export default mongoose.model<INoShowPenalty>('NoShowPenalty', noShowPenaltySchema);
