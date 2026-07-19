import mongoose from "mongoose";

const generatedQuestionsSchema = new mongoose.Schema({
    technical: [{ type: String }],

    projectBased: [{ type: String }],

    behavioral: [{ type: String }],

    culturalFit: [{ type: String }]
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