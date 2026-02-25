const prisma = require('../config/database');
const logger = require('../config/logger');
const AppError = require('../utils/AppError');
const { getFilesUrls } = require('../utils/fileUpload');

const submitInquiry = async (req, res, next) => {
    try {
        const { name, email, phone, description } = req.body;
        const files = req.files || [];

        const images = getFilesUrls(files, 'designs');

        const inquiry = await prisma.designInquiry.create({
            data: {
                name,
                email,
                phone,
                description,
                images,
                status: 'PENDING',
                userId: req.user?.id || null // Capture User ID if available
            }
        });

        logger.info(`New design inquiry from ${email}`);

        res.status(201).json({
            success: true,
            message: 'Inquiry submitted successfully',
            data: inquiry
        });
    } catch (error) {
        next(error);
    }
};

const getInquiries = async (req, res, next) => {
    try {
        const inquiries = await prisma.designInquiry.findMany({
            orderBy: { createdAt: 'desc' }
        });
        res.json({ success: true, data: { inquiries } });
    } catch (error) {
        next(error);
    }
};

const updateInquiryStatus = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const inquiry = await prisma.designInquiry.update({
            where: { id },
            data: { status }
        });

        res.json({ success: true, data: { inquiry } });
    } catch (error) {
        next(error);
    }
};

const replyToInquiry = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { reply } = req.body;

        const inquiry = await prisma.designInquiry.update({
            where: { id },
            data: {
                adminReply: reply,
                adminReplyAt: new Date(),
                status: 'CONTACTED' // Auto update status
            }
        });

        res.json({ success: true, data: { inquiry } });
    } catch (error) {
        next(error);
    }
};

const getUserInquiries = async (req, res, next) => {
    try {
        const inquiries = await prisma.designInquiry.findMany({
            where: { userId: req.user.id },
            orderBy: { createdAt: 'desc' }
        });
        res.json({ success: true, data: { inquiries } });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    submitInquiry,
    getInquiries,
    updateInquiryStatus,
    replyToInquiry,
    getUserInquiries
};
