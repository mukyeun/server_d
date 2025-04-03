const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  residentNumber: { type: String, required: true },
  gender: { type: String, required: true },
  // ... 기존 필드들 ...
  
  // 스트레스 관련 필드 추가
  stress: {
    type: String,  // '매우 높음', '보통', '낮음'
    default: '낮음',
    required: true
  },
  stressScore: {
    type: Number,  // 총점
    default: 0,
    required: true
  },
  stressLevel: {
    type: String,  // '높음', '중간', '낮음'
    default: '낮음',
    required: true
  },
  stressDescription: {
    type: String,  // 상세 설명
    default: '특이사항 없음',
    required: true
  },
  selectedStressItems: {
    type: Array,
    default: [],
    required: true
  },
  
  // 기존 stressEvaluation 필드는 하위 호환성을 위해 유지
  stressEvaluation: {
    type: String,
    default: '낮음 (0점)',
    required: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('User', userSchema); 