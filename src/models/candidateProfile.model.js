import mongoose from 'mongoose';

const projectSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true  
    },
    techUsed: [{
        type: String,
        required: true
    }]
});


const candidateProfileSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true  
    },
    resumeText: {
        type: String
    },
    linkedinText: {
        type: String
    },
    parsedSkills: [{type: String}],

    parsedProjects: [projectSchema],

    parsedExperience: [{type: String}],

    parsedEducation: [{type: String}],

    updatedAt: {
        type: Date,
        default: Date.now
    }
});

export const CandidateProfile = mongoose.model('CandidateProfile', candidateProfileSchema);