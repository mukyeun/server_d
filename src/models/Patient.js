const mongoose = require('mongoose');

// 맥파 데이터 스키마 완성
const pulseWaveSchema = new mongoose.Schema({
  heartRate: { type: Number, default: null },
  HR: { type: Number, default: null },
  elasticityScore: { type: Number, default: null },
  PVC: { type: Number, default: null },
  BV: { type: Number, default: null },
  SV: { type: Number, default: null },
  'a-b': { type: Number, default: null },
  'a-c': { type: Number, default: null },
  'a-d': { type: Number, default: null },
  'a-e': { type: Number, default: null },
  'b/a': { type: Number, default: null },
  'c/a': { type: Number, default: null },
  'd/a': { type: Number, default: null },
  'e/a': { type: Number, default: null },
  systolicBP: { type: Number, default: null },
  diastolicBP: { type: Number, default: null },
  pulsePressure: { type: Number, default: null },
  lastUpdated: { type: Date, default: Date.now }
}, { 
  _id: false,
  strict: false,
  minimize: false
});

// 스트레스 항목 스키마
const stressItemSchema = new mongoose.Schema({
  label: { type: String, required: true },
  value: { type: String, required: true },
  score: { type: Number, required: true, min: 0, max: 100 }
}, { _id: false });

// 약물 정보 스키마
const medicationSchema = new mongoose.Schema({
  drugs: { type: [String], default: [] },
  preferences: { type: [String], default: [] },
  allergies: { type: [String], default: [] },
  sideEffects: { type: [String], default: [] }
}, { _id: false, strict: false });

// 스트레스 정보 스키마
const stressSchema = new mongoose.Schema({
  items: { type: [String], default: [] },
  level: { type: String, default: null },
  totalScore: { type: Number, default: null }
}, { _id: false, strict: false });

// 기본 정보 스키마
const basicInfoSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: [true, '이름은 필수입니다'] 
  },
  residentNumber: { 
    type: String, 
    required: [true, '주민번호는 필수입니다'],
    unique: true 
  },
  gender: { type: String, default: null },
  height: { type: Number, default: null },
  weight: { type: Number, default: null },
  bmi: { type: Number, default: null },
  bloodPressure: { type: String, default: null },
  workIntensity: { type: String, default: null },
  personality: { type: String, default: null },
  phone: { type: String, default: null },
  birthDate: {
    type: Date,
    default: null
  }
}, { _id: false, strict: false });

// 진료 기록 스키마 (단일 기록용)
const recordSchema = new mongoose.Schema({
  heartRate: { type: Number, default: null },
  pulseWave: { 
    type: pulseWaveSchema,
    default: () => ({})
  },
  stress: {
    type: stressSchema,
    default: () => ({})
  },
  symptoms: { 
    type: [String], 
    default: [] 
  },
  medications: {
    type: medicationSchema,
    default: () => ({
      drugs: [],
      preferences: [],
      allergies: [],
      sideEffects: []
    })
  },
  memo: { 
    type: String, 
    default: '' 
  },
  measurementDate: { 
    type: Date, 
    default: Date.now 
  }
}, { 
  _id: true,  // ✅ 각 기록별 고유 ID 부여
  timestamps: true
});

// 최상위 환자 스키마 (records를 배열로 변경)
const patientSchema = new mongoose.Schema({
  basicInfo: basicInfoSchema,
  records: [recordSchema],  // ✅ 배열로 변경
  lastUpdated: { 
    type: Date, 
    default: Date.now 
  }
}, { 
  timestamps: true,
  versionKey: false
});

// 인덱스 설정
patientSchema.index({ 'basicInfo.name': 1 });
patientSchema.index({ 'basicInfo.residentNumber': 1 }, { unique: true });

// 가상 필드: 나이 계산
patientSchema.virtual('basicInfo.age').get(function() {
  if (!this.basicInfo.residentNumber) return null;
  const birthYear = parseInt(this.basicInfo.residentNumber.substring(0, 2));
  const currentYear = new Date().getFullYear() % 100;
  return birthYear > currentYear ? currentYear + 100 - birthYear : currentYear - birthYear;
});

// 가상 필드: 최신 기록
patientSchema.virtual('latestRecord').get(function() {
  return this.records.length > 0 ? 
    this.records[this.records.length - 1] : null;
});

// 저장 전 미들웨어
patientSchema.pre('save', function(next) {
  // lastUpdated 갱신
  this.lastUpdated = new Date();
  
  // 데이터 구조 로깅
  console.log('💾 저장 전 데이터 구조:', {
    patientId: this._id,
    recordsCount: this.records.length,
    latestRecord: {
      date: this.records[this.records.length - 1]?.measurementDate,
      hasMedications: !!this.records[this.records.length - 1]?.medications,
      hasPulseWave: !!this.records[this.records.length - 1]?.pulseWave
    }
  });
  next();
});

module.exports = mongoose.model('Patient', patientSchema);