import { Router } from 'express';
import { db } from '../db';
import { eq, desc, and, like, ilike } from 'drizzle-orm';
import { digitalFiles } from '../../shared/schema';
// removed unused imports

const router = Router();

// GET /api/files - Retrieve digital files with filters
router.get('/', async (req, res) => {
  try {
    const { 
      folder_name, 
      file_type, 
      client_id, 
      session_id,
      search_term,
      is_public,
      limit = '20'
    } = req.query;

    const baseQuery = db.select({
      id: digitalFiles.id,
      folder_name: digitalFiles.folderName,
      file_name: digitalFiles.fileName,
      file_type: digitalFiles.fileType,
      file_size: digitalFiles.fileSize,
      client_id: digitalFiles.clientId,
      session_id: digitalFiles.sessionId,
      description: digitalFiles.description,
      tags: digitalFiles.tags,
      is_public: digitalFiles.isPublic,
      uploaded_at: digitalFiles.uploadedAt,
      created_at: digitalFiles.createdAt,
      updated_at: digitalFiles.updatedAt
    }).from(digitalFiles);

    // Apply filters
    const conditions = [];
    
    if (folder_name) {
  conditions.push(ilike(digitalFiles.folderName, `%${folder_name}%`));
    }
    
    if (file_type) {
  conditions.push(eq(digitalFiles.fileType, file_type as any));
    }
    
    if (client_id) {
  conditions.push(eq(digitalFiles.clientId, client_id as string));
    }
    
    if (session_id) {
  conditions.push(eq(digitalFiles.sessionId, session_id as string));
    }
    
    if (search_term) {
      // Search in file name and description
  const searchCondition = like(digitalFiles.fileName, `%${search_term}%`);
      conditions.push(searchCondition);
    }
    
    if (is_public !== undefined) {
  conditions.push(eq(digitalFiles.isPublic, is_public === 'true'));
    }

    const finalQuery = conditions.length > 0
      ? baseQuery.where(and(...conditions))
      : baseQuery;
    const files = await finalQuery
      .orderBy(desc(digitalFiles.uploadedAt))
      .limit(parseInt(limit as string));

    res.json(files);
  } catch (error) {
    console.error('Failed to fetch digital files:', error);
    res.status(500).json({ error: 'Failed to fetch digital files' });
  }
});

// POST /api/files - Upload new file
router.post('/', async (req, res) => {
  try {
    const {
      folder_name,
      file_name,
      file_type,
      file_size,
      client_id,
      session_id,
      description = '',
      tags = [],
      is_public = false
    } = req.body;

    // Validate required fields
    if (!folder_name || !file_name || !file_type || !file_size) {
      return res.status(400).json({ 
        error: 'Missing required fields: folder_name, file_name, file_type, file_size' 
      });
    }

    const fileId = crypto.randomUUID();
    
    const [newFile] = await db.insert(digitalFiles).values({
      id: fileId,
      folderName: folder_name,
      fileName: file_name,
      fileType: file_type,
      fileSize: file_size,
      clientId: client_id || null,
      sessionId: session_id || null,
      description,
      tags: JSON.stringify(tags),
      isPublic: is_public,
      uploadedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();

    res.status(201).json(newFile);
  } catch (error) {
    console.error('Failed to upload file:', error);
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

// PUT /api/files/:id - Update file metadata
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };
    
    // Remove ID from update data
    delete updateData.id;
    
    // Convert tags to JSON string if provided
    if (updateData.tags && Array.isArray(updateData.tags)) {
      updateData.tags = JSON.stringify(updateData.tags);
    }
    
    // Set updated timestamp
    updateData.updated_at = new Date();

    const [updatedFile] = await db
  .update(digitalFiles)
      .set(updateData)
  .where(eq(digitalFiles.id, id))
      .returning();

    if (!updatedFile) {
      return res.status(404).json({ error: 'File not found' });
    }

    res.json(updatedFile);
  } catch (error) {
    console.error('Failed to update file:', error);
    res.status(500).json({ error: 'Failed to update file' });
  }
});

// DELETE /api/files/:id - Delete file
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const [deletedFile] = await db
  .delete(digitalFiles)
  .where(eq(digitalFiles.id, id))
      .returning();

    if (!deletedFile) {
      return res.status(404).json({ error: 'File not found' });
    }

    res.json({ 
      message: 'File deleted successfully', 
      file: deletedFile 
    });
  } catch (error) {
    console.error('Failed to delete file:', error);
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

// GET /api/files/folders - Get folder organization and statistics
router.get('/folders', async (req, res) => {
  try {
    const { folder_name } = req.query;

    // Get folder statistics
    let folderStatsQuery = `
      SELECT 
        folder_name,
        COUNT(*) as file_count,
        SUM(file_size) as total_size,
        COUNT(CASE WHEN file_type = 'image' THEN 1 END) as image_count,
        COUNT(CASE WHEN file_type = 'document' THEN 1 END) as document_count,
        COUNT(CASE WHEN file_type = 'video' THEN 1 END) as video_count,
        MAX(uploaded_at) as last_uploaded
      FROM digital_files
    `;

    const values = [];
    if (folder_name) {
      folderStatsQuery += ` WHERE folder_name = $1`;
      values.push(folder_name);
    }

    folderStatsQuery += ` GROUP BY folder_name ORDER BY file_count DESC`;

    const { neon } = await import('@neondatabase/serverless');
    const sql = neon(process.env.DATABASE_URL!);
    
    const folders = await sql(folderStatsQuery, values);

    // Get recent files
    const recentFiles = await sql`
      SELECT folder_name, file_name, file_type, uploaded_at
      FROM digital_files
      ORDER BY uploaded_at DESC
      LIMIT 10
    `;

    res.json({
      total_folders: folders.length,
      folders: folders.map(folder => ({
        name: folder.folder_name,
        file_count: folder.file_count,
        total_size: `${(folder.total_size / 1024 / 1024).toFixed(2)} MB`,
        breakdown: {
          images: folder.image_count,
          documents: folder.document_count,
          videos: folder.video_count
        },
        last_uploaded: folder.last_uploaded
      })),
      recent_files: recentFiles.map(file => ({
        folder: file.folder_name,
        name: file.file_name,
        type: file.file_type,
        uploaded: file.uploaded_at
      }))
    });
  } catch (error) {
    console.error('Failed to get folder organization:', error);
    res.status(500).json({ error: 'Failed to get folder organization' });
  }
});

export default router;