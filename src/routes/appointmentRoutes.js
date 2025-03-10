const express = require('express');
const router = express.Router();
const Appointment = require('../models/Appointment');

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

module.exports = router; 