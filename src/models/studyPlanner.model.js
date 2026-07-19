import mongoose from 'mongoose';

const taskSchema = new mongoose.Schema({
    day: {
        type: String,
        required: true
    },
    task: {
        type: String,
        required: true
    },
    done: {
        type: Boolean,
        default: false
    }
});

const milestoneSchema = new mongoose.Schema({
    week: {
        type: String,
        required: true
    },
    goal: {
        type: String,
        required: true
    }
})

const studyPlannerSchema = new mongoose.Schema({
    roadmapId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Roadmap',
        required: true,
    },
    dailyTasks: [taskSchema],

    weeklyMilestones: [milestoneSchema],

    estimatedCompletionDate: {
        type: Date,
    }
})


export const StudyPlanner = mongoose.model('StudyPlanner', studyPlannerSchema);