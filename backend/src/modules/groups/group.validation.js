// ============================================
// GROUP VALIDATION
// ============================================
const { body, param } = require('express-validator');

const createGroupSchema = [
    body('name')
        .trim()
        .notEmpty().withMessage('Group name is required')
        .isLength({ min: 2, max: 100 })
        .withMessage('Group name must be between 2 and 100 characters'),
    body('description')
        .optional({ nullable: true })
        .trim()
        .isLength({ max: 500 })
        .withMessage('Description must be under 500 characters'),
];

const updateGroupSchema = [
    body('name')
        .optional()
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Group name must be between 2 and 100 characters'),
    body('description')
        .optional({ nullable: true })
        .trim()
        .isLength({ max: 500 })
        .withMessage('Description must be under 500 characters'),
];

const addMemberSchema = [
    body('userId')
        .exists().withMessage('userId is required')
        .isInt({ min: 1 }).withMessage('userId must be a positive integer'),
];

const groupIdParamSchema = [
    param('groupId')
        .isInt({ min: 1 }).withMessage('Invalid group ID'),
];

module.exports = {
    createGroupSchema,
    updateGroupSchema,
    addMemberSchema,
    groupIdParamSchema,
};