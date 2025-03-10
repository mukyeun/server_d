const mongoose = require('mongoose');

const pulseRecordSchema = new mongoose.Schema({
    patientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Patient',
        required: true
    },
    recordDate: {
        type: Date,
        default: Date.now,
        required: true
    },
    pulseData: {
        // 맥파 데이터 구조
        waveform: [Number],  // 맥파 파형 데이터 배열
        frequency: Number,   // 측정된 맥박수
        strength: Number,    // 맥파 강도
    },
    notes: {
        type: String        // 측정 시 특이사항
    },
    measuredBy: {
        type: String        // 측정자 정보
    }
});

module.exports = mongoose.model('PulseRecord', pulseRecordSchema); 