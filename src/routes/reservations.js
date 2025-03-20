const express = require('express');
const router = express.Router();
const Patient = require('../models/Patient');
const Appointment = require('../models/Appointment');

// POST /api/reservations - 환자 정보 저장
router.post('/', async (req, res) => {
  try {
    const {
      name,
      phone,
      residentNumber,
      gender,
      height,
      weight,
      memo,
      reservationDate
    } = req.body;

    // 필수 필드 검증
    if (!name || !phone || !residentNumber || !gender) {
      return res.status(400).json({
        status: 'error',
        message: '필수 입력 항목이 누락되었습니다.'
      });
    }

    // 환자 정보 생성
    const patient = new Patient({
      name,
      phone,
      residentNumber,
      gender,
      height: height || null,
      weight: weight || null,
      memo: memo || '',
      reservationDate
    });

    const savedPatient = await patient.save();
    console.log('Patient saved:', savedPatient);

    res.status(201).json(savedPatient);

  } catch (error) {
    console.error('Patient creation error:', error);
    res.status(500).json({
      status: 'error',
      message: '환자 정보 저장 중 오류가 발생했습니다.'
    });
  }
});

// 검색 라우트
router.get('/search', async (req, res) => {
  try {
    const { term } = req.query;
    console.log('🔍 검색어:', term);

    // 1. 환자 검색
    const patients = await Patient.find({
      $or: [
        { name: { $regex: term, $options: 'i' } },
        { phone: { $regex: term, $options: 'i' } }
      ]
    });
    console.log('👥 환자 검색 결과:', patients.length, '명');

    if (patients.length === 0) {
      return res.json({
        status: 'success',
        data: []
      });
    }

    // 2. 예약 정보 검색
    const appointments = await Appointment.find({
      patientId: { $in: patients.map(p => p._id) }
    })
    .populate('patientId')  // 환자의 모든 정보를 가져옴
    .sort({ date: -1 });  // 최신 예약순으로 정렬

    // 3. 응답 데이터 구성
    const results = appointments.map(apt => ({
      id: apt._id,
      // 환자 기본 정보
      name: apt.patientId.name,
      phone: apt.patientId.phone,
      gender: apt.patientId.gender,
      residentNumber: apt.patientId.residentNumber,
      // 예약 정보
      date: apt.date,
      time: apt.time,
      status: apt.status,
      // 추가 정보들
      height: apt.patientId.height,
      weight: apt.patientId.weight,
      bmi: apt.patientId.bmi,
      // 기타 필요한 필드들 추가
      symptoms: apt.symptoms,
      medications: apt.medications,
      pulseData: apt.pulseData,
      bloodPressure: apt.bloodPressure
    }));

    res.json({
      status: 'success',
      data: results
    });

  } catch (error) {
    console.error('❌ 검색 오류:', error);
    res.status(500).json({
      status: 'error',
      message: '검색 중 오류가 발생했습니다.'
    });
  }
});

module.exports = router; 