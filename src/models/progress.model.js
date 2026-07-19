import mongoose from "mongoose";

const progressSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    topicId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Topic',
        required: true
    },
    completed: {
        type: Boolean,
        required: true,
        default: false
    },
    streak: {
        type: Number,
        default: 0
    },
    completedAt: {
        type: Date,
    }
})

export const Progress = mongoose.model('Progress', progressSchema);