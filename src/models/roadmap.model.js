import mongoose  from "mongoose";

const roadmapSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    subject: {
        type: String,
        required: true,
        trim: true
    },
    goal: {
        type: String,
        required: true,
        enum: ['Placement', 'College Exams', 'Hackathon', 'Research', 'Freelancing'],
    },
    level: {
        type: String,
        required: true,
        enum: ['Beginner', 'Intermediate', 'Advanced'],
    },
    timeAvailable: {
        type: String,
        required: true,   
    }
})

export const Roadmap = mongoose.model('Roadmap', roadmapSchema);