const express = require('express');
const mongoose = require('mongoose');
const Income = require('../models/Income');
const Transaction = require('../models/Transaction');
const authMiddleware = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');

const router = express.Router();
router.use(authMiddleware);
router.use(requireRole('admin', 'accountant'));

const EXPENSE_CATEGORIES = [
  'Teachers Salary',
  'Rents',
  'Hospitality',
  'Printing',
  'Stationary',
  'Furniture',
  'Repair',
  'Entertainment',
  'Advertisement',
  'Other',
];

const MANUAL_INCOME_CATEGORIES = [
  'Selling Assets',
  'Receive Donation',
  'Other',
];

// Category label helper for income categories
const INCOME_CATEGORY_LABELS = {
  student_fee: 'Student Fee',
  book_sales: 'Book Sales',
  stationery: 'Stationery',
  exam_fee: 'Exam Fee',
  syllabus_fee: 'Syllabus Fee',
  fine: 'Fine',
  other: 'Other',
};

// GET /api/transactions — merged income + expense ledger sorted by date asc
router.get('/', async (req, res) => {
  try {
    const schoolId = new mongoose.Types.ObjectId(req.schoolId);
    const { from, to } = req.query;

    const dateFilter = {};
    if (from && typeof from === 'string' && from.trim()) {
      dateFilter.$gte = new Date(from.trim());
    }
    if (to && typeof to === 'string' && to.trim()) {
      // Include the full end day
      const endDate = new Date(to.trim());
      endDate.setHours(23, 59, 59, 999);
      dateFilter.$lte = endDate;
    }

    const incomeMatch = { school_id: schoolId };
    const expenseMatch = { school_id: schoolId, type: 'expense' };
    if (Object.keys(dateFilter).length > 0) {
      incomeMatch.date = dateFilter;
      expenseMatch.date = dateFilter;
    }

    const manualIncomeMatch = { school_id: schoolId, type: 'income' };
    if (Object.keys(dateFilter).length > 0) {
      manualIncomeMatch.date = dateFilter;
    }

    const [incomeRecords, expenseRecords, manualIncomeRecords] = await Promise.all([
      Income.find(incomeMatch)
        .populate('student_id', 'name')
        .sort({ date: 1, createdAt: 1 })
        .lean(),
      Transaction.find(expenseMatch).sort({ date: 1, createdAt: 1 }).lean(),
      Transaction.find(manualIncomeMatch).sort({ date: 1, createdAt: 1 }).lean(),
    ]);

    // Map fee income records to LedgerRow shape
    const incomeRows = incomeRecords.map((r) => {
      const studentName =
        r.student_id && typeof r.student_id === 'object' && r.student_id.name
          ? r.student_id.name
          : null;
      const catLabel = INCOME_CATEGORY_LABELS[r.category] || r.category;
      return {
        _id: r._id.toString(),
        type: 'income',
        source: 'fee',
        title: studentName ? `${studentName} - ${catLabel}` : catLabel,
        category: catLabel,
        amount: r.amount,
        date: r.date,
        note: r.note || '',
      };
    });

    // Map manual income records to LedgerRow shape
    const manualIncomeRows = manualIncomeRecords.map((r) => ({
      _id: r._id.toString(),
      type: 'income',
      source: 'manual_income',
      title: r.title || r.category || 'Income',
      category: r.category || '',
      amount: r.amount,
      date: r.date,
      note: r.note || '',
    }));

    // Map expense records to LedgerRow shape
    const expenseRows = expenseRecords.map((r) => ({
      _id: r._id.toString(),
      type: 'expense',
      source: 'expense',
      title: r.title || r.category || 'Expense',
      category: r.category || '',
      amount: r.amount,
      date: r.date,
      note: r.note || '',
    }));

    // Merge and sort by date ascending, then by createdAt
    const merged = [...incomeRows, ...manualIncomeRows, ...expenseRows].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    res.json({ success: true, data: merged });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/transactions/expense — add a new expense
router.post('/expense', async (req, res) => {
  try {
    const schoolId = new mongoose.Types.ObjectId(req.schoolId);
    const { date, title, category, amount, note } = req.body;

    if (!date || !title || !category || amount == null) {
      return res.status(400).json({ success: false, error: 'date, title, category, and amount are required' });
    }
    if (!EXPENSE_CATEGORIES.includes(category)) {
      return res.status(400).json({ success: false, error: `Invalid category. Must be one of: ${EXPENSE_CATEGORIES.join(', ')}` });
    }
    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ success: false, error: 'amount must be a positive number' });
    }
    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) {
      return res.status(400).json({ success: false, error: 'Invalid date' });
    }

    const tx = await Transaction.create({
      school_id: schoolId,
      type: 'expense',
      title: String(title).trim(),
      category: String(category).trim(),
      amount: numAmount,
      date: parsedDate,
      note: note ? String(note).trim() : '',
    });

    res.status(201).json({
      success: true,
      data: {
        _id: tx._id.toString(),
        type: 'expense',
        title: tx.title,
        category: tx.category,
        amount: tx.amount,
        date: tx.date,
        note: tx.note,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/transactions/expense/:id — delete an expense
router.delete('/expense/:id', async (req, res) => {
  try {
    const schoolId = new mongoose.Types.ObjectId(req.schoolId);
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, error: 'Invalid id' });
    }

    const tx = await Transaction.findOneAndDelete({
      _id: new mongoose.Types.ObjectId(id),
      school_id: schoolId,
      type: 'expense',
    });

    if (!tx) {
      return res.status(404).json({ success: false, error: 'Expense not found' });
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/transactions/income — add a manual income entry
router.post('/income', async (req, res) => {
  try {
    const schoolId = new mongoose.Types.ObjectId(req.schoolId);
    const { date, title, category, amount, note } = req.body;

    if (!date || !title || !category || amount == null) {
      return res.status(400).json({ success: false, error: 'date, title, category, and amount are required' });
    }
    if (!MANUAL_INCOME_CATEGORIES.includes(category)) {
      return res.status(400).json({ success: false, error: `Invalid category. Must be one of: ${MANUAL_INCOME_CATEGORIES.join(', ')}` });
    }
    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ success: false, error: 'amount must be a positive number' });
    }
    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) {
      return res.status(400).json({ success: false, error: 'Invalid date' });
    }

    const tx = await Transaction.create({
      school_id: schoolId,
      type: 'income',
      title: String(title).trim(),
      category: String(category).trim(),
      amount: numAmount,
      date: parsedDate,
      note: note ? String(note).trim() : '',
    });

    res.status(201).json({
      success: true,
      data: {
        _id: tx._id.toString(),
        type: 'income',
        source: 'manual_income',
        title: tx.title,
        category: tx.category,
        amount: tx.amount,
        date: tx.date,
        note: tx.note,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/transactions/income/:id — delete a manual income entry
router.delete('/income/:id', async (req, res) => {
  try {
    const schoolId = new mongoose.Types.ObjectId(req.schoolId);
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, error: 'Invalid id' });
    }

    const tx = await Transaction.findOneAndDelete({
      _id: new mongoose.Types.ObjectId(id),
      school_id: schoolId,
      type: 'income',
    });

    if (!tx) {
      return res.status(404).json({ success: false, error: 'Manual income not found' });
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
