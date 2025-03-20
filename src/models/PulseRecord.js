const mongoose = require('mongoose');

const pulseRecordSchema = new mongoose.Schema({
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true
  },
  systolic: {  // 수축기 혈압
    type: Number,
    required: true
  },
  diastolic: {  // 이완기 혈압
    type: Number,
    required: true
  },
  heartRate: {  // 심박수
    type: Number,
    required: true
  },
  measuredAt: {  // 측정 시간
    type: Date,
    default: Date.now
  },
  notes: {  // 특이사항
    type: String,
    default: ''
  }
}, {
  timestamps: true  // createdAt, updatedAt 자동 생성
});

const PulseRecord = mongoose.model('PulseRecord', pulseRecordSchema);

module.exports = PulseRecord; 