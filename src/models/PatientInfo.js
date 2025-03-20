const mongoose = require('mongoose');

const patientInfoSchema = new mongoose.Schema({
  // 기본 정보
  name: { type: String, required: true },
  phone: { type: String, required: true },
  residentNumber: { type: String, required: true },
  gender: { type: String, required: true },
  height: { type: Number },
  weight: { type: Number },
  bmi: { type: Number },
  
  // 성격, 업무강도
  personality: { type: String },
  workIntensity: { type: String },
  
  // 스트레스 정보
  selectedStressCategory: { type: String },
  selectedStressEvents: [{ type: String }],
  totalStressScore: { type: Number },
  stressLevel: { type: String },
  
  // 증상 정보
  selectedCategory: { type: String },
  selectedSubCategory: { type: String },
  selectedSymptom: { type: String },
  selectedSymptoms: [{ type: String }],
  
  // 약물 정보
  medication: { type: String },
  selectedMedications: [{ type: String }],
  
  // 기호식품 정보
  preference: { type: String },
  selectedPreferences: [{ type: String }],
  
  // 예약 관련
  memo: { type: String },
  reservationDate: { type: Date, default: Date.now },
  
  // 시스템 필드
  isActive: { type: Boolean, default: true }
}, {
  timestamps: true
});

// 기존 모델이 있다면 삭제
try {
  mongoose.deleteModel('PatientInfo');
} catch (error) {
  // 모델이 없는 경우 무시
}

const PatientInfo = mongoose.model('PatientInfo', patientInfoSchema);

module.exports = PatientInfo; 