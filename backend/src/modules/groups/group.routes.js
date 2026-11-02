// ============================================
// GROUP ROUTES
// ============================================
const express = require('express');
const router = express.Router();

const groupController = require('./group.controller');
const settlementController = require('./settlement.controller');
const { protect } = require('../../middleware/auth.middleware');
const { validate } = require('../../middleware/validation.middleware');
const { rateLimiter } = require('../../middleware/rateLimiter');
const {
    createGroupSchema,
    updateGroupSchema,
    addMemberSchema,
    groupIdParamSchema,
} = require('./group.validation');

// All group routes require auth
router.use(protect);

// Rate limits
const writeLimit = rateLimiter({ windowMs: 60 * 1000, max: 20 });
const readLimit = rateLimiter({ windowMs: 60 * 1000, max: 60 });

// ---------- CRUD ----------
router.post('/', writeLimit, validate(createGroupSchema), groupController.createGroup);
router.get('/', readLimit, groupController.listGroups);
router.get('/:groupId', readLimit, validate(groupIdParamSchema), groupController.getGroup);
router.patch('/:groupId', writeLimit, validate(groupIdParamSchema), validate(updateGroupSchema), groupController.updateGroup);
router.delete('/:groupId', writeLimit, validate(groupIdParamSchema), groupController.deleteGroup);
router.get('/:groupId/balances', settlementController.getBalances);
router.post('/:groupId/settle', settlementController.settleUp);
router.get('/expenses/:expenseId/settlements', settlementController.getExpenseSettlements);
router.post('/expenses/:expenseId/settle', settlementController.settleExpense);

// ---------- MEMBERS ----------
router.post('/:groupId/members', writeLimit, validate(groupIdParamSchema), validate(addMemberSchema), groupController.addMember);
router.delete('/:groupId/members/:userId', writeLimit, validate(groupIdParamSchema), groupController.removeMember);
router.post('/:groupId/leave', writeLimit, validate(groupIdParamSchema), groupController.leaveGroup);

module.exports = router;