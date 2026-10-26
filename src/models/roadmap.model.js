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
    },
    // History of AI adjustments made to the remaining topics
    adaptations: [{
        instruction: { type: String, default: "" },
        summary: { type: String, required: true },
        at: { type: Date, default: Date.now }
    }]
})

export const Roadmap = mongoose.model('Roadmap', roadmapSchema);