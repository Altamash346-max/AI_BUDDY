import mongoose from 'mongoose';

const questionSchema = new mongoose.Schema({
    question: {
        type: String,
        required: true
    },
    options: [{
        type: String,
        required: true}],
    correctOptionIndex: {
        type: Number,
        required: true
    }

})

const quizSchema = new mongoose.Schema({
    topicId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Topic',
        required: true
    },
    questions: [questionSchema]
});

export const Quiz = mongoose.model('Quiz', quizSchema);