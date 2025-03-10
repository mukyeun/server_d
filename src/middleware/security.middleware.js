const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');

// Rate limiting 설정
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15분
    max: 100 // IP당 최대 요청 수
});

// 보안 미들웨어 설정
const securityMiddleware = (app) => {
    // HTTP 헤더 보안
    app.use(helmet());

    // Rate limiting 적용
    app.use('/api', limiter);

    // NoSQL 인젝션 방지
    app.use(mongoSanitize());

    // XSS 공격 방지
    app.use(xss());
};

module.exports = securityMiddleware; 