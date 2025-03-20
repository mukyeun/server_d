const mongoose = require('mongoose');

const patientSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    residentNumber: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    phone: {
        type: String,
        required: true
    },
    gender: {
        type: String,
        required: true,
        enum: ['male', 'female']
    },
    height: {
        type: Number,
        default: null
    },
    weight: {
        type: Number,
        default: null
    },
    personality: {
        type: String,
        default: null
    },
    workIntensity: {
        type: String,
        default: null
    },
    bmi: {
        type: Number,
        default: null
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// 중복 체크를 위한 인덱스 생성
patientSchema.index({ residentNumber: 1 }, { unique: true });

const Patient = mongoose.model('Patient', patientSchema);

module.exports = Patient; 