const Joi = require('joi');

// 기본 정보 스키마
const basicInfoSchema = Joi.object({
  name: Joi.string().required().messages({
    'string.empty': '이름은 필수입니다.',
    'any.required': '이름은 필수입니다.'
  }),
  residentNumber: Joi.string().required().messages({
    'string.empty': '주민번호는 필수입니다.',
    'any.required': '주민번호는 필수입니다.'
  }),
  gender: Joi.string().valid('남', '여'),
  personality: Joi.string().allow('', null),
  height: Joi.number().min(0).max(300),
  weight: Joi.number().min(0).max(300),
  bmi: Joi.number().min(0).max(100),
  bloodPressure: Joi.string().allow('', null),
  workIntensity: Joi.string().valid('매우 심함', '심함', '보통', '적음', '매우 적음').allow(null)
}).unknown(true);

// 맥파 데이터 스키마 수정
const pulseWaveSchema = Joi.object({
  heartRate: Joi.number(),
  HR: Joi.number(),  // ✅ HR 필드 명시적 허용
  elasticityScore: Joi.number(),
  PVC: Joi.number(),
  BV: Joi.number(),
  SV: Joi.number(),
  'a-b': Joi.number(),
  'a-c': Joi.number(),
  'a-d': Joi.number(),
  'a-e': Joi.number(),
  'b/a': Joi.number(),
  'c/a': Joi.number(),
  'd/a': Joi.number(),
  'e/a': Joi.number()
}).unknown(true);

// 스트레스 스키마
const stressSchema = Joi.object({
  level: Joi.string(),
  totalScore: Joi.number(),
  items: Joi.array().items(Joi.string())
}).unknown(true);

// 약물 정보 스키마 수정
const medicationsSchema = Joi.object({
  drugs: Joi.array().items(Joi.string()),      // ✅ 실제 약물 목록
  preferences: Joi.array().items(Joi.string()), // 선호도/기호품
  allergies: Joi.array().items(Joi.string()),   // 알레르기
  sideEffects: Joi.array().items(Joi.string()), // 부작용
  // medications 필드 제거 (drugs로 통일)
}).unknown(true);

// records 스키마
const recordsSchema = Joi.object({
  heartRate: Joi.number(),
  pulseWave: pulseWaveSchema,
  stress: stressSchema,
  symptoms: Joi.array().items(Joi.string()),
  medications: medicationsSchema,
  memo: Joi.string().allow('', null),
  measurementDate: Joi.date().default(() => new Date())
}).unknown(true);

// 전체 환자 데이터 스키마
const patientSchema = Joi.object({
  basicInfo: basicInfoSchema.required(),
  records: recordsSchema.required()  // ✅ records를 객체로 정의 (배열 아님)
}).unknown(true);

// 유효성 검사 함수 개선
const validatePatientData = (data) => {
  // 1. 원본 데이터 구조 로깅
  console.log('🔍 검증 전 데이터 구조:', {
    basicInfo: data.basicInfo ? Object.keys(data.basicInfo) : null,
    records: data.records ? {
      hasHeartRate: 'heartRate' in data.records,
      hasPulseWave: !!data.records.pulseWave,
      pulseWaveFields: data.records.pulseWave ? Object.keys(data.records.pulseWave) : null,
      hasMedications: !!data.records.medications,
      medicationFields: data.records.medications ? Object.keys(data.records.medications) : null,
      hasMemo: 'memo' in data.records
    } : null
  });

  // 2. HR 필드 자동 보완
  if (data.records?.pulseWave) {
    if (!data.records.pulseWave.HR && data.records.pulseWave.heartRate) {
      data.records.pulseWave.HR = data.records.pulseWave.heartRate;
    }
  }

  // 3. 유효성 검사 실행
  const result = patientSchema.validate(data, {
    abortEarly: false,
    stripUnknown: false
  });

  // 4. 검증 결과 상세 로깅
  if (result.error) {
    console.error('❌ 유효성 검사 실패:', {
      details: result.error.details.map(err => ({
        path: err.path.join('.'),
        message: err.message,
        type: err.type,
        context: err.context
      })),
      receivedData: {
        hasBasicInfo: !!data.basicInfo,
        recordsFields: data.records ? Object.keys(data.records) : null,
        pulseWaveFields: data.records?.pulseWave ? Object.keys(data.records.pulseWave) : null,
        medicationsFields: data.records?.medications ? Object.keys(data.records.medications) : null
      }
    });
  } else {
    console.log('✅ 유효성 검사 통과');
  }

  return result;
};

module.exports = {
  validatePatientData,
  formatValidationError: (error) => ({
    message: '데이터 유효성 검사 실패',
    details: error.details.map(err => ({
      field: err.path.join('.'),
      message: err.message,
      type: err.type,
      context: err.context
    }))
  })
}; 