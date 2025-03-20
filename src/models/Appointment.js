const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
    patientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Patient',
        required: true
    },
    date: {
        type: String,
        required: true,
        validate: {
            validator: function(v) {
                return /^\d{4}-\d{2}-\d{2}$/.test(v);
            },
            message: '날짜는 YYYY-MM-DD 형식이어야 합니다.'
        }
    },
    time: {
        type: String,
        required: true,
        validate: {
            validator: function(v) {
                return /^\d{2}:\d{2}$/.test(v);
            },
            message: '시간은 HH:mm 형식이어야 합니다.'
        }
    },
    symptoms: [{
        type: String
    }],
    medications: [{
        type: String
    }],
    preferences: [{
        type: String
    }],
    stressEvents: [{
        type: String
    }],
    memo: {
        type: String,
        default: ''
    },
    stressLevel: Number,
    stressCategories: [String],
    status: {
        type: String,
        enum: ['confirmed', 'cancelled', 'completed'],
        default: 'confirmed'
    }
}, {
    timestamps: true,
    toJSON: { 
        virtuals: true,
        transform: function(doc, ret) {
            ret.id = ret._id;
            delete ret._id;
            delete ret.__v;
            return ret;
        }
    }
});

// 중복 예약 방지를 위한 복합 인덱스
appointmentSchema.index({ date: 1, time: 1 }, { unique: true });

// 저장 전 데이터 정규화 및 검증
appointmentSchema.pre('save', async function(next) {
    try {
        // patientId를 ObjectId로 변환
        if (this.patientId && typeof this.patientId === 'string') {
            this.patientId = mongoose.Types.ObjectId(this.patientId);
        }

        // 배열 필드 정규화
        if (Array.isArray(this.symptoms)) {
            this.symptoms = this.symptoms.map(s => String(s).trim()).filter(Boolean);
        }
        if (Array.isArray(this.medications)) {
            this.medications = this.medications.map(m => String(m).trim()).filter(Boolean);
        }
        if (Array.isArray(this.preferences)) {
            this.preferences = this.preferences.map(p => String(p).trim()).filter(Boolean);
        }
        if (Array.isArray(this.stressEvents)) {
            this.stressEvents = this.stressEvents
                .map(event => ({
                    name: String(event.name || '').trim(),
                    score: Number(event.score || 1)
                }))
                .filter(event => event.name);
        }

        next();
    } catch (error) {
        next(error);
    }
});

const Appointment = mongoose.model('Appointment', appointmentSchema);

module.exports = Appointment; 