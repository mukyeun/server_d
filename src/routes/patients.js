const express = require('express');
const router = express.Router();
const Patient = require('../models/patient');

// 라우터가 제대로 동작하는지 확인하기 위한 로그 추가
console.log('환자 라우터 초기화됨');

// POST /api/patients - 환자 정보 저장
router.post('/', async (req, res) => {
  try {
    const { residentNumber } = req.body;

    // 1. 먼저 기존 환자 검색
    let patient = await Patient.findOne({ residentNumber });

    if (patient) {
      // 기존 환자가 있는 경우
      console.log('기존 환자 발견:', patient);
      return res.json({
        status: 'existing',
        message: '이미 등록된 환자입니다.',
        patient
      });
    }

    // 2. 새 환자 등록
    patient = new Patient(req.body);
    await patient.save();
    
    console.log('새 환자 등록 완료:', patient);
    return res.status(201).json({
      status: 'success',
      message: '환자 정보가 성공적으로 저장되었습니다.',
      patient
    });

  } catch (error) {
    console.error('서버 오류:', error);
    
    // MongoDB 중복 키 에러 처리
    if (error.code === 11000) {
      try {
        // Race condition 대비 재검색
        const existingPatient = await Patient.findOne({ 
          residentNumber: req.body.residentNumber 
        });
        
        if (existingPatient) {
          return res.json({
            status: 'existing',
            message: '이미 등록된 환자입니다.',
            patient: existingPatient
          });
        }
      } catch (searchError) {
        console.error('기존 환자 검색 중 오류:', searchError);
      }
    }

    return res.status(500).json({
      status: 'error',
      message: '환자 정보 저장 중 오류가 발생했습니다.',
      error: error.message
    });
  }
});

// 환자 검색 API
router.get('/search', async (req, res) => {
  try {
    const { residentNumber } = req.query;
    
    if (!residentNumber) {
      return res.status(400).json({
        status: 'error',
        message: '주민등록번호가 필요합니다.'
      });
    }

    const patient = await Patient.findOne({ residentNumber });
    
    if (!patient) {
      return res.status(404).json({
        status: 'error',
        message: '환자를 찾을 수 없습니다.'
      });
    }

    res.json({
      status: 'success',
      patient
    });
  } catch (error) {
    console.error('환자 검색 중 오류:', error);
    res.status(500).json({
      status: 'error',
      message: '환자 검색 중 오류가 발생했습니다.'
    });
  }
});

// 라우터 내보내기
module.exports = router; 