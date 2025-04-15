const express = require('express');
const router = express.Router();
const xlsx = require('xlsx');
const Patient = require('../models/Patient');
const { exec } = require('child_process');
const path = require('path');
const { validatePatientData, formatValidationError } = require('../validators/patientValidator');

// 에러를 next로 전달하는 비동기 핸들러 래퍼
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

// 유틸 함수: 빈 문자열이면 null 처리
const cleanString = (str) => (typeof str === 'string' && str.trim() === '' ? null : str);

// 유틸 함수: 숫자 정제
const cleanNumber = (num) => (num === '' || isNaN(num) ? null : Number(num));

// 스트레스 레벨 등급 계산 함수
const calculateStressGrade = (score) => {
  if (score >= 75) return '매우 위험';
  if (score >= 50) return '위험';
  if (score >= 25) return '보통';
  return '낮음';
};

// 스트레스 레벨 계산 함수
const calculateStressLevel = (score) => {
  if (score >= 75) return '매우 위험';
  if (score >= 50) return '위험';
  if (score >= 25) return '보통';
  return '낮음';
};

// 데이터 정제 함수
const cleanPulseWave = (data) => {
  const result = {};
  const fields = ['a-b', 'a-c', 'a-d', 'a-e', 'b/a', 'c/a', 'd/a', 'e/a', 'HR', 'PVC', 'BV', 'SV'];
  fields.forEach(field => {
    result[field] = data[field] ? Number(data[field]) : null;
  });
  return result;
};

// 환자 검색 API (가장 위에 배치)
router.get('/search', asyncHandler(async (req, res) => {
    const { name, phone } = req.query;
    let query = {};

    if (name) {
        query.name = { $regex: name, $options: 'i' };
    }
    if (phone) {
        query['contact.phone'] = { $regex: phone };
    }

    const patients = await Patient.find(query);
    if (!patients.length) {
        return res.status(404).json({ 
            status: 'warning',
            message: '검색 결과가 없습니다' 
        });
    }
    res.json(patients);
}));

// 고급 검색 API (날짜 범위 추가)
router.get('/advanced-search', asyncHandler(async (req, res) => {
    const { name, phone, startDate, endDate, gender } = req.query;
    let query = {};

    if (name) query.name = { $regex: name, $options: 'i' };
    if (phone) query['contact.phone'] = { $regex: phone };
    if (gender) query.gender = gender;
    if (startDate || endDate) {
        query.birthDate = {};
        if (startDate) query.birthDate.$gte = new Date(startDate);
        if (endDate) query.birthDate.$lte = new Date(endDate);
    }

    const patients = await Patient.find(query);
    if (!patients.length) {
        return res.status(404).json({ 
            status: 'warning',
            message: '검색 결과가 없습니다' 
        });
    }
    res.json(patients);
}));

// 환자 정보 저장 API
router.post('/', async (req, res) => {
  try {
    const { error, value } = validatePatientData(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: '데이터 검증 실패',
        details: formatValidationError(error)
      });
    }

    const { basicInfo, records } = value;

    // 기존 환자 확인
    const existingPatient = await Patient.findOne({
      'basicInfo.residentNumber': basicInfo.residentNumber
    });

    if (existingPatient) {
      // 기존 환자 - 새 기록 추가
      console.log('📝 기존 환자 기록 추가:', {
        patientId: existingPatient._id,
        currentRecords: existingPatient.records.length
      });

      // 기본 정보 업데이트 (선택적 필드만)
      Object.assign(existingPatient.basicInfo, {
        ...existingPatient.basicInfo,
        height: basicInfo.height || existingPatient.basicInfo.height,
        weight: basicInfo.weight || existingPatient.basicInfo.weight,
        bmi: basicInfo.bmi || existingPatient.basicInfo.bmi,
        workIntensity: basicInfo.workIntensity || existingPatient.basicInfo.workIntensity,
        personality: basicInfo.personality || existingPatient.basicInfo.personality
      });

      // 새 기록 추가
      existingPatient.records.push({
        ...records,
        measurementDate: new Date()
      });

      const savedPatient = await existingPatient.save();
      
      return res.status(200).json({
        success: true,
        message: '새로운 측정 기록이 추가되었습니다.',
        data: {
          patientId: savedPatient._id,
          recordsCount: savedPatient.records.length,
          latestRecord: savedPatient.latestRecord
        }
      });

    } else {
      // 신규 환자 - 새 문서 생성
      console.log('✨ 신규 환자 등록:', {
        name: basicInfo.name,
        residentNumber: basicInfo.residentNumber
      });

      const newPatient = new Patient({
        basicInfo,
        records: [{
          ...records,
          measurementDate: new Date()
        }]
      });

      const savedPatient = await newPatient.save();

      return res.status(201).json({
        success: true,
        message: '새 환자가 등록되었습니다.',
        data: {
          patientId: savedPatient._id,
          recordsCount: 1,
          latestRecord: savedPatient.latestRecord
        }
      });
    }

  } catch (error) {
    console.error('❌ 서버 오류:', error);
    return res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.',
      error: error.message
    });
  }
});

// 환자의 모든 기록 조회
router.get('/:residentNumber/records', async (req, res) => {
  try {
    const patient = await Patient.findOne({ 
      residentNumber: req.params.residentNumber 
    });

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: '환자를 찾을 수 없습니다.'
      });
    }

    // 날짜 기준 내림차순 정렬
    const sortedRecords = patient.records.sort((a, b) => 
      new Date(b.measuredAt) - new Date(a.measuredAt)
    );

    res.status(200).json({
      success: true,
      data: {
        patientInfo: {
          name: patient.name,
          residentNumber: patient.residentNumber,
          gender: patient.gender,
          birthDate: patient.birthDate
        },
        records: sortedRecords
      }
    });

  } catch (error) {
    console.error('조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.'
    });
  }
});

// 특정 기간의 기록 조회
router.get('/:residentNumber/records/period', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const patient = await Patient.findOne({ 
      residentNumber: req.params.residentNumber 
    });

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: '환자를 찾을 수 없습니다.'
      });
    }

    // 기간 필터링
    const filteredRecords = patient.records.filter(record => {
      const recordDate = new Date(record.measuredAt);
      return (!startDate || recordDate >= new Date(startDate)) &&
             (!endDate || recordDate <= new Date(endDate));
    }).sort((a, b) => new Date(b.measuredAt) - new Date(a.measuredAt));

    res.status(200).json({
      success: true,
      data: {
        patientInfo: {
          name: patient.name,
          residentNumber: patient.residentNumber,
          gender: patient.gender,
          birthDate: patient.birthDate
        },
        records: filteredRecords
      }
    });

  } catch (error) {
    console.error('조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.'
    });
  }
});

// 환자 목록 조회
router.get('/', async (req, res) => {
  try {
    const patients = await Patient.find({})
      .select('residentNumber basicInfo records')
      .sort('-updatedAt');
    
    return res.status(200).json({
      success: true,
      data: patients
    });
  } catch (error) {
    console.error('조회 오류:', error);
    return res.status(500).json({
      success: false,
      message: '환자 목록 조회 중 오류가 발생했습니다.'
    });
  }
});

// 특정 환자 정보 조회
router.get('/patients/:id', async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id);
    
    if (!patient) {
      return res.status(404).json({ 
        success: false,
        message: '해당 환자를 찾을 수 없습니다.' 
      });
    }

    res.json({ 
      success: true,
      data: patient 
    });

  } catch (error) {
    console.error('특정 환자 조회 에러:', error);
    res.status(500).json({ 
      success: false,
      message: '환자 정보 조회 중 오류가 발생했습니다.',
      error: error.message 
    });
  }
});

// 환자 정보 수정
router.put('/patients/:id', async (req, res) => {
  try {
    const updatedPatient = await Patient.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!updatedPatient) {
      return res.status(404).json({ 
        success: false,
        message: '해당 환자를 찾을 수 없습니다.' 
      });
    }

    res.json({ 
      success: true,
      message: '환자 정보가 성공적으로 수정되었습니다.',
      data: updatedPatient 
    });

  } catch (error) {
    console.error('환자 정보 수정 에러:', error);
    res.status(500).json({ 
      success: false,
      message: '환자 정보 수정 중 오류가 발생했습니다.',
      error: error.message 
    });
  }
});

// 환자 정보 삭제
router.delete('/patients/:id', async (req, res) => {
  try {
    const deletedPatient = await Patient.findByIdAndDelete(req.params.id);

    if (!deletedPatient) {
      return res.status(404).json({ 
        success: false,
        message: '해당 환자를 찾을 수 없습니다.' 
      });
    }

    res.json({ 
      success: true,
      message: '환자 정보가 성공적으로 삭제되었습니다.',
      data: deletedPatient 
    });

  } catch (error) {
    console.error('환자 정보 삭제 에러:', error);
    res.status(500).json({ 
      success: false,
      message: '환자 정보 삭제 중 오류가 발생했습니다.',
      error: error.message 
    });
  }
});

// 맥파 데이터 저장 엔드포인트
router.post('/wave-data', async (req, res) => {
  try {
    const waveData = req.body;

    // 클라이언트에서 전송된 분석 데이터를 그대로 응답
    res.status(200).json({
      success: true,
      data: waveData
    });

  } catch (error) {
    console.error('맥파 데이터 처리 오류:', error);
    res.status(500).json({
      success: false,
      message: '맥파 데이터 처리 중 오류가 발생했습니다.'
    });
  }
});

// 유비오맥파기 실행
router.post('/launch-ubio', async (req, res) => {
  try {
    const ubioPath = 'C:/Program Files/uBioMacpa/uBioMacpa.exe'; // 실제 설치 경로로 수정 필요

    exec(`"${ubioPath}"`, (error, stdout, stderr) => {
      if (error) {
        console.error('유비오맥파기 실행 오류:', error);
        return res.status(500).json({
          success: false,
          error: '유비오맥파기 실행 중 오류가 발생했습니다.'
        });
      }
      
      res.json({
        success: true,
        message: '유비오맥파기가 실행되었습니다.'
      });
    });

  } catch (error) {
    console.error('유비오맥파기 실행 오류:', error);
    res.status(500).json({
      success: false,
      error: error.message || '유비오맥파기 실행 중 오류가 발생했습니다.'
    });
  }
});

module.exports = router; 