const express = require('express');
const { body, validationResult } = require('express-validator');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
const router = express.Router();

// Mock storage (in production, use cloud storage)
const uploadedFiles = [];
const folders = [];
const shares = [];

// Multer configuration for file uploads
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|txt|zip|mp4|mp3/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

// 1. Upload File
router.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const file = {
    id: uuidv4(),
    filename: req.file.originalname,
    mimetype: req.file.mimetype,
    size: req.file.size,
    userId: req.body.userId || 'anonymous',
    folderId: req.body.folderId || null,
    uploadedAt: new Date().toISOString(),
    path: `/uploads/${uuidv4()}-${req.file.originalname}`
  };

  uploadedFiles.push(file);
  res.status(201).json({ message: 'File uploaded successfully', file });
});

// 2. Get All Files
router.get('/files', (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const userId = req.query.userId;
  const folderId = req.query.folderId;
  const search = req.query.search;

  let filteredFiles = uploadedFiles;
  
  if (userId) {
    filteredFiles = filteredFiles.filter(f => f.userId === userId);
  }
  
  if (folderId) {
    filteredFiles = filteredFiles.filter(f => f.folderId === folderId);
  }
  
  if (search) {
    filteredFiles = filteredFiles.filter(f => 
      f.filename.toLowerCase().includes(search.toLowerCase())
    );
  }

  filteredFiles.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));

  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  const result = filteredFiles.slice(startIndex, endIndex);

  res.json({
    files: result,
    pagination: {
      page,
      limit,
      total: filteredFiles.length,
      pages: Math.ceil(filteredFiles.length / limit)
    }
  });
});

// 3. Get File by ID
router.get('/files/:fileId', (req, res) => {
  const { fileId } = req.params;
  const file = uploadedFiles.find(f => f.id === fileId);
  
  if (!file) {
    return res.status(404).json({ error: 'File not found' });
  }

  res.json({ file });
});

// 4. Update File
router.put('/files/:fileId', [
  body('filename').optional().isLength({ min: 1 }),
  body('folderId').optional().isUUID()
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { fileId } = req.params;
  const fileIndex = uploadedFiles.findIndex(f => f.id === fileId);
  
  if (fileIndex === -1) {
    return res.status(404).json({ error: 'File not found' });
  }

  uploadedFiles[fileIndex] = { 
    ...uploadedFiles[fileIndex], 
    ...req.body, 
    updatedAt: new Date().toISOString() 
  };

  res.json({ message: 'File updated successfully', file: uploadedFiles[fileIndex] });
});

// 5. Delete File
router.delete('/files/:fileId', (req, res) => {
  const { fileId } = req.params;
  const fileIndex = uploadedFiles.findIndex(f => f.id === fileId);
  
  if (fileIndex === -1) {
    return res.status(404).json({ error: 'File not found' });
  }

  uploadedFiles.splice(fileIndex, 1);
  res.json({ message: 'File deleted successfully' });
});

// 6. Create Folder
router.post('/folders', [
  body('name').isLength({ min: 1, max: 100 }),
  body('userId').exists(),
  body('parentId').optional().isUUID()
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const folder = {
    id: uuidv4(),
    ...req.body,
    createdAt: new Date().toISOString()
  };

  folders.push(folder);
  res.status(201).json({ message: 'Folder created successfully', folder });
});

// 7. Get All Folders
router.get('/folders', (req, res) => {
  const userId = req.query.userId;
  const parentId = req.query.parentId;

  let filteredFolders = folders;
  
  if (userId) {
    filteredFolders = filteredFolders.filter(f => f.userId === userId);
  }
  
  if (parentId) {
    filteredFolders = filteredFolders.filter(f => f.parentId === parentId);
  }

  res.json({ folders: filteredFolders });
});

// 8. Get Folder Contents
router.get('/folders/:folderId/contents', (req, res) => {
  const { folderId } = req.params;
  const folder = folders.find(f => f.id === folderId);
  
  if (!folder) {
    return res.status(404).json({ error: 'Folder not found' });
  }

  const folderFiles = uploadedFiles.filter(f => f.folderId === folderId);
  const subfolders = folders.filter(f => f.parentId === folderId);

  res.json({
    folder,
    files: folderFiles,
    folders: subfolders,
    totalFiles: folderFiles.length,
    totalFolders: subfolders.length
  });
});

// 9. Delete Folder
router.delete('/folders/:folderId', (req, res) => {
  const { folderId } = req.params;
  const folderIndex = folders.findIndex(f => f.id === folderId);
  
  if (folderIndex === -1) {
    return res.status(404).json({ error: 'Folder not found' });
  }

  // Move files to root or delete them
  uploadedFiles.forEach(file => {
    if (file.folderId === folderId) {
      file.folderId = null;
    }
  });

  // Delete subfolders
  const deleteRecursive = (parentId) => {
    const subfolderIndices = folders
      .map((f, i) => f.parentId === parentId ? i : -1)
      .filter(i => i !== -1)
      .reverse();
    
    subfolderIndices.forEach(index => {
      deleteRecursive(folders[index].id);
      folders.splice(index, 1);
    });
  };

  deleteRecursive(folderId);
  folders.splice(folderIndex, 1);

  res.json({ message: 'Folder deleted successfully' });
});

// 10. Share File
router.post('/share', [
  body('fileId').exists(),
  body('userId').exists(),
  body('permission').isIn(['view', 'edit', 'download']),
  body('expiresAt').optional().isISO8601()
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { fileId, userId, permission, expiresAt } = req.body;
  const file = uploadedFiles.find(f => f.id === fileId);
  
  if (!file) {
    return res.status(404).json({ error: 'File not found' });
  }

  const share = {
    id: uuidv4(),
    fileId,
    userId,
    permission,
    expiresAt: expiresAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    shareToken: uuidv4(),
    createdAt: new Date().toISOString()
  };

  shares.push(share);
  res.status(201).json({ message: 'File shared successfully', share });
});

// 11. Get Shared Files
router.get('/shared/:userId', (req, res) => {
  const { userId } = req.params;
  const userShares = shares.filter(s => s.userId === userId);
  
  const sharedFiles = userShares.map(share => {
    const file = uploadedFiles.find(f => f.id === share.fileId);
    return { ...share, file };
  });

  res.json({ shares: sharedFiles });
});

// 12. Access Shared File
router.get('/shared/file/:shareToken', (req, res) => {
  const { shareToken } = req.params;
  const share = shares.find(s => s.shareToken === shareToken);
  
  if (!share) {
    return res.status(404).json({ error: 'Share not found' });
  }

  if (share.expiresAt && new Date(share.expiresAt) < new Date()) {
    return res.status(410).json({ error: 'Share has expired' });
  }

  const file = uploadedFiles.find(f => f.id === share.fileId);
  if (!file) {
    return res.status(404).json({ error: 'File not found' });
  }

  res.json({ share, file });
});

// 13. Copy File
router.post('/copy', [
  body('fileId').exists(),
  body('userId').exists(),
  body('folderId').optional().isUUID()
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { fileId, userId, folderId } = req.body;
  const originalFile = uploadedFiles.find(f => f.id === fileId);
  
  if (!originalFile) {
    return res.status(404).json({ error: 'Original file not found' });
  }

  const copiedFile = {
    ...originalFile,
    id: uuidv4(),
    filename: `Copy of ${originalFile.filename}`,
    userId,
    folderId,
    uploadedAt: new Date().toISOString(),
    copiedFrom: fileId
  };

  uploadedFiles.push(copiedFile);
  res.status(201).json({ message: 'File copied successfully', file: copiedFile });
});

// 14. Move File
router.post('/move', [
  body('fileId').exists(),
  body('folderId').optional().isUUID()
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { fileId, folderId } = req.body;
  const fileIndex = uploadedFiles.findIndex(f => f.id === fileId);
  
  if (fileIndex === -1) {
    return res.status(404).json({ error: 'File not found' });
  }

  if (folderId && !folders.find(f => f.id === folderId)) {
    return res.status(404).json({ error: 'Target folder not found' });
  }

  uploadedFiles[fileIndex].folderId = folderId;
  uploadedFiles[fileIndex].updatedAt = new Date().toISOString();

  res.json({ message: 'File moved successfully', file: uploadedFiles[fileIndex] });
});

// 15. Get Storage Stats
router.get('/stats/:userId', (req, res) => {
  const { userId } = req.params;
  const userFiles = uploadedFiles.filter(f => f.userId === userId);
  const userFolders = folders.filter(f => f.userId === userId);
  
  const totalSize = userFiles.reduce((sum, file) => sum + file.size, 0);
  const fileTypes = {};
  
  userFiles.forEach(file => {
    const ext = file.filename.split('.').pop().toLowerCase();
    fileTypes[ext] = (fileTypes[ext] || 0) + 1;
  });

  const stats = {
    userId,
    totalFiles: userFiles.length,
    totalFolders: userFolders.length,
    totalSize,
    averageFileSize: userFiles.length > 0 ? totalSize / userFiles.length : 0,
    fileTypes,
    storageUsed: (totalSize / (1024 * 1024)).toFixed(2) + ' MB'
  };

  res.json(stats);
});

module.exports = router;