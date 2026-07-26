import mongoose from "mongoose";

const resourceSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
    },
    url: {
        type: String,
        required: true,
    },
    type: {
        type: String,
        required: true,
        enum: ['video', 'article', 'documentation', 'course', 'practice', 'project'],
        default: 'article'
    }
})

const topicSchema = new mongoose.Schema({
    roadmapId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Roadmap',
        required: true,
    },
    title: {
        type: String,
        required: true,
    },
    order: {
        type: Number,
        required: true,
    },
    status: {
        type: String,
        required: true,
        enum: ['locked', 'current', 'completed'],
    },
    resources: [resourceSchema]
})

export const Topic = mongoose.model('Topic', topicSchema);