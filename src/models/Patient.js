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
    bloodPressure: {
        systolic: { type: Number, default: null },
        diastolic: { type: Number, default: null }
    },
    selectedSymptoms: {
        type: [String],
        default: []
    },
    medication: {
        type: [String],
        default: []
    },
    preference: {
        type: [String],
        default: []
    },
    ab_ms: { type: String, default: null },
    ac_ms: { type: String, default: null },
    ad_ms: { type: String, default: null },
    ae_ms: { type: String, default: null },
    ba_ratio: { type: String, default: null },
    ca_ratio: { type: String, default: null },
    da_ratio: { type: String, default: null },
    ea_ratio: { type: String, default: null },
    pvc: { type: String, default: null },
    hr: { type: String, default: null },
    memo: { type: String, default: null },
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

// 저장 전 updatedAt 자동 업데이트
patientSchema.pre('save', function(next) {
    this.updatedAt = new Date();
    next();
});

const Patient = mongoose.model('Patient', patientSchema);

module.exports = Patient; 