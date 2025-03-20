const express = require('express');
const router = express.Router();
const Appointment = require('../models/Appointment');
const Patient = require('../models/patient');
const mongoose = require('mongoose');

// 영업 시간 설정
const BUSINESS_HOURS = {
  start: '09:00',
  end: '18:00',
  interval: 30
};

// 시간 유효성 검사 함수
const isValidAppointmentTime = (time) => {
  if (!time) return false;
  
  const [hours, minutes] = time.split(':').map(Number);
  const [startHours, startMinutes] = BUSINESS_HOURS.start.split(':').map(Number);
  const [endHours, endMinutes] = BUSINESS_HOURS.end.split(':').map(Number);
  
  const timeInMinutes = hours * 60 + minutes;
  const startInMinutes = startHours * 60 + startMinutes;
  const endInMinutes = endHours * 60 + endMinutes;
  
  // 영업 시간 내 체크
  if (timeInMinutes < startInMinutes || timeInMinutes > endInMinutes) {
    return false;
  }
  
  // 30분 단위 체크
  if (minutes % BUSINESS_HOURS.interval !== 0) {
    return false;
  }
  
  return true;
};

// CORS 미들웨어 추가
router.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

// 모든 요청에 대한 로깅
router.use((req, res, next) => {
  console.log('👉 요청 정보:', {
    method: req.method,
    url: req.url,
    path: req.path,
    query: req.query,
    params: req.params
  });
  next();
});

// 검색 라우트를 별도의 핸들러로 분리
const handleSearch = async (req, res) => {
  try {
    const { term } = req.query;
    console.log('🔍 검색 시작:', term);

    // 환자 검색
    const patients = await Patient.find({
      $or: [
        { name: { $regex: term, $options: 'i' } },
        { phone: { $regex: term, $options: 'i' } }
      ]
    });
    console.log('👥 검색된 환자:', patients.length, '명');

    // 예약 검색
    const appointments = await Appointment.find({
      patientId: { $in: patients.map(p => p._id) }
    })
    .populate('patientId', 'name phone')
    .sort({ date: 1, time: 1 });
    console.log('📅 검색된 예약:', appointments.length, '건');

    res.json({
      status: 'success',
      data: appointments.map(apt => ({
        id: apt._id,
        name: apt.patientId.name,
        phone: apt.patientId.phone,
        date: apt.date,
        time: apt.time,
        status: apt.status
      }))
    });

  } catch (error) {
    console.error('❌ 검색 오류:', error);
    res.status(500).json({
      status: 'error',
      message: '검색 중 오류가 발생했습니다.'
    });
  }
};

// 검색 라우트 등록
router.get('/search', handleSearch);

// GET /api/appointments/check - 예약 가능 여부 확인
router.get('/check', async (req, res) => {
  try {
    const { appointmentDate, appointmentTime } = req.query;

    if (!appointmentDate || !appointmentTime) {
      return res.status(400).json({
        status: 'error',
        message: '날짜와 시간이 필요합니다.'
      });
    }

    // 해당 시간대에 예약이 있는지 확인
    const existingAppointment = await Appointment.findOne({
      date: appointmentDate,
      time: appointmentTime
    });

    res.json({
      status: 'success',
      available: !existingAppointment // 예약이 없으면 true, 있으면 false
    });

  } catch (error) {
    console.error('예약 가능 여부 확인 중 오류:', error);
    res.status(500).json({
      status: 'error',
      message: '예약 가능 여부 확인 중 오류가 발생했습니다.'
    });
  }
});

// POST /api/appointments - 새 예약 생성
router.post('/', async (req, res) => {
  try {
    console.log('📝 예약 생성 요청:', req.body);
    const { date, time, patientId } = req.body;

    // 날짜/시간 형식 검증
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({
        status: 'error',
        message: '날짜는 YYYY-MM-DD 형식이어야 합니다.'
      });
    }

    if (!time || !/^\d{2}:\d{2}$/.test(time)) {
      return res.status(400).json({
        status: 'error',
        message: '시간은 HH:mm 형식이어야 합니다.'
      });
    }

    // 중복 예약 확인
    const existingAppointment = await Appointment.findOne({
      date,
      time,
      status: { $ne: 'cancelled' }
    });

    if (existingAppointment) {
      return res.status(409).json({
        status: 'error',
        message: `${date} ${time}에 이미 예약이 존재합니다.`
      });
    }

    // 새 예약 생성
    const newAppointment = new Appointment({
      patientId,
      date,
      time,
      symptoms: req.body.symptoms || [],
      medications: req.body.medications || [],
      stressLevel: req.body.stressLevel,
      stressCategories: req.body.stressCategories || [],
      status: 'confirmed'
    });

    await newAppointment.save();
    console.log('✅ 새 예약 저장됨:', newAppointment._id);

    // 해당 날짜의 모든 예약 조회
    const allAppointments = await Appointment.find({
      date: date,
      status: { $ne: 'cancelled' }
    })
    .populate('patientId', 'name phone gender')
    .sort({ time: 1 })
    .lean();

    console.log('📋 조회된 전체 예약 수:', allAppointments.length);
    console.log('📋 전체 예약 목록:', JSON.stringify(allAppointments, null, 2));

    // 응답 전송
    res.status(201).json({
      status: 'success',
      message: '예약이 성공적으로 저장되었습니다.',
      appointment: newAppointment.toObject(),
      appointments: allAppointments
    });

  } catch (error) {
    console.error('❌ 예약 생성 중 오류:', error);
    res.status(500).json({
      status: 'error',
      message: '예약 생성 중 오류가 발생했습니다.',
      error: error.message
    });
  }
});

// 날짜별 예약 조회
router.get('/date/:date', async (req, res) => {
  try {
    const { date } = req.params;
    console.log('📅 예약 조회 요청 날짜:', date);

    const appointments = await Appointment.find({ 
      date,
      status: { $ne: 'cancelled' }
    })
    .populate('patientId', 'name phone gender')
    .sort({ time: 1 })
    .lean();

    console.log('✅ 조회된 예약:', appointments);

    res.json({
      status: 'success',
      message: '예약 조회가 완료되었습니다.',
      data: appointments
    });

  } catch (error) {
    console.error('❌ 예약 조회 중 오류:', error);
    res.status(500).json({
      status: 'error',
      message: '예약 조회 중 오류가 발생했습니다.',
      error: error.message
    });
  }
});

// 예약 상태 변경
router.patch('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const appointment = await Appointment.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    ).populate('patientId');

    if (!appointment) {
      return res.status(404).json({
        status: 'error',
        message: '예약을 찾을 수 없습니다.'
      });
    }

    res.json({
      status: 'success',
      appointment
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: '예약 상태 업데이트 중 오류가 발생했습니다.'
    });
  }
});

// 예약 목록 조회
router.get('/', async (req, res) => {
  try {
    const { date } = req.query;
    console.log('조회 요청된 날짜:', date);

    // date가 있는 경우 해당 날짜의 예약만, 없으면 전체 예약 조회
    const query = date ? { date } : {};

    const appointments = await Appointment.find(query)
      .populate('patientId') // 환자 정보 포함
      .sort({ date: 1, time: 1 }); // 날짜와 시간순으로 정렬

    console.log('조회된 예약:', appointments);

    res.json({
      status: 'success',
      appointments: appointments
    });
  } catch (error) {
    console.error('예약 조회 중 오류:', error);
    res.status(500).json({
      status: 'error',
      message: '예약 목록 조회 중 오류가 발생했습니다.'
    });
  }
});

// 예약 삭제 API
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await Appointment.findByIdAndDelete(id);

    res.json({
      status: 'success',
      message: '예약이 삭제되었습니다.'
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: '예약 삭제 중 오류가 발생했습니다.'
    });
  }
});

module.exports = router; 