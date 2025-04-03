const mongoose = require('mongoose');

// MongoDB 연결 설정
const connectDB = async () => {
    try {
        // MongoDB 연결
        const conn = await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        
        console.log(`MongoDB 연결 성공: ${conn.connection.host}`);

        // 연결 상태 모니터링
        mongoose.connection.on('connected', () => {
            console.log('MongoDB에 연결되었습니다');
        });

        mongoose.connection.on('error', (err) => {
            console.error('MongoDB 연결 에러:', err);
        });

        mongoose.connection.on('disconnected', () => {
            console.log('MongoDB 연결이 끊어졌습니다');
        });

        // 애플리케이션 종료 시 연결 종료
        process.on('SIGINT', async () => {
            await mongoose.connection.close();
            console.log('MongoDB 연결이 종료되었습니다');
            process.exit(0);
        });

    } catch (error) {
        console.error('MongoDB 연결 실패:', error);
        process.exit(1);
    }
};

module.exports = connectDB;