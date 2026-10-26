import mongoose from "mongoose";

// Each item is { question, answer }. Mixed so preps saved before expected answers
// were added (plain question strings) still load.
const generatedQuestionsSchema = new mongoose.Schema({
    technical: [mongoose.Schema.Types.Mixed],

    projectBased: [mongoose.Schema.Types.Mixed],

    behavioral: [mongoose.Schema.Types.Mixed],

    culturalFit: [mongoose.Schema.Types.Mixed]
})

const interviewPrepSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    company: {
        type: String,
        required: true
    },
    role: {
        type: String,
        required: true    
    },
    jobDescription: {
        type: String,
        required: true
    },
    generatedQuestions: generatedQuestionsSchema,

    createdAt: {
        type: Date,
        default: Date.now
    }
});

export const InterviewPrep = mongoose.model('InterviewPrep', interviewPrepSchema);