const express = require('express');
const router = express.Router();
const Appointment = require('../models/Appointment');
const Patient = require('../models/Patient');

// 디버깅을 위한 로깅
router.use((req, res, next) => {
  console.log('👉 Appointments 요청:', {
    method: req.method,
    path: req.path,
    query: req.query
  });
  next();
});

// 검색 라우트
router.get('/search', async (req, res) => {
  try {
    const { term } = req.query;
    console.log('🔍 검색어:', term);

    // 환자 검색
    const patients = await Patient.find({
      $or: [
        { name: { $regex: term, $options: 'i' } },
        { phone: { $regex: term, $options: 'i' } }
      ]
    });
    console.log('👥 환자 검색 결과:', patients.length, '명');

    // 예약 검색
    const appointments = await Appointment.find({
      patientId: { $in: patients.map(p => p._id) }
    })
    .populate('patientId', 'name phone')
    .sort({ date: 1, time: 1 });
    console.log('📅 예약 검색 결과:', appointments.length, '건');

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
});

// 에러를 next로 전달하는 비동기 핸들러 래퍼
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

// 예약 생성 (Create)
router.post('/', asyncHandler(async (req, res) => {
    const appointment = new Appointment(req.body);
    const savedAppointment = await appointment.save();
    res.status(201).json({
        status: 'success',
        data: savedAppointment
    });
}));

// 모든 예약 조회 (Read)
router.get('/', asyncHandler(async (req, res) => {
    const appointments = await Appointment.find()
        .populate('patientId', 'name contact')
        .sort({ appointmentDate: 1 });
    
    if (!appointments.length) {
        return res.status(404).json({
            status: 'warning',
            message: '예약 정보가 없습니다'
        });
    }
    res.json({
        status: 'success',
        count: appointments.length,
        data: appointments
    });
}));

// 특정 환자의 예약 조회
router.get('/patient/:patientId', asyncHandler(async (req, res) => {
    const appointments = await Appointment.find({ 
        patientId: req.params.patientId,
        appointmentDate: { $gte: new Date() }
    }).sort({ appointmentDate: 1 });

    if (!appointments.length) {
        return res.status(404).json({
            status: 'warning',
            message: '해당 환자의 예약이 없습니다'
        });
    }
    res.json({
        status: 'success',
        count: appointments.length,
        data: appointments
    });
}));

// 특정 날짜의 예약 조회
router.get('/date/:date', asyncHandler(async (req, res) => {
    const date = new Date(req.params.date);
    const nextDate = new Date(date);
    nextDate.setDate(date.getDate() + 1);

    const appointments = await Appointment.find({
        appointmentDate: {
            $gte: date,
            $lt: nextDate
        }
    }).populate('patientId', 'name contact');

    if (!appointments.length) {
        return res.status(404).json({
            status: 'warning',
            message: '해당 날짜의 예약이 없습니다'
        });
    }
    res.json({
        status: 'success',
        count: appointments.length,
        data: appointments
    });
}));

// 예약 상태 업데이트 (Update)
router.patch('/:id/status', asyncHandler(async (req, res) => {
    const updatedAppointment = await Appointment.findByIdAndUpdate(
        req.params.id,
        { status: req.body.status },
        { new: true, runValidators: true }
    );

    if (!updatedAppointment) {
        return res.status(404).json({
            status: 'error',
            message: '수정할 예약을 찾을 수 없습니다'
        });
    }
    res.json({
        status: 'success',
        data: updatedAppointment
    });
}));

// 예약 수정 (Update)
router.put('/:id', asyncHandler(async (req, res) => {
    const updatedAppointment = await Appointment.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
    );

    if (!updatedAppointment) {
        return res.status(404).json({
            status: 'error',
            message: '수정할 예약을 찾을 수 없습니다'
        });
    }
    res.json({
        status: 'success',
        data: updatedAppointment
    });
}));

// 예약 삭제 (Delete)
router.delete('/:id', asyncHandler(async (req, res) => {
    const appointment = await Appointment.findByIdAndDelete(req.params.id);
    
    if (!appointment) {
        return res.status(404).json({
            status: 'error',
            message: '삭제할 예약을 찾을 수 없습니다'
        });
    }
    res.json({
        status: 'success',
        message: '예약이 삭제되었습니다'
    });
}));

// 예약 가능 여부 확인
router.get('/availability', asyncHandler(async (req, res) => {
    const { date, time } = req.query;
    
    if (!date || !time) {
        return res.status(400).json({
            status: 'error',
            message: '날짜와 시간이 필요합니다'
        });
    }

    // 해당 날짜와 시간에 예약이 있는지 확인
    const [hours, minutes] = time.split(':');
    const appointmentDate = new Date(date);
    appointmentDate.setHours(parseInt(hours), parseInt(minutes), 0);

    const existingAppointment = await Appointment.findOne({
        appointmentDate
    });

    res.json({
        status: 'success',
        available: !existingAppointment
    });
}));

module.exports = router; 