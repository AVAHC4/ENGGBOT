/**
 * Projects API Routes for ENGGBOT
 * 
 * Provides secure, authenticated endpoints for managing project workspaces.
 * Each user can only access and manipulate their own projects.
 */

import express from 'express';
import { supabase } from '../lib/supabase.js';

const router = express.Router();

// Middleware to ensure user is authenticated
const requireAuth = (req: any, res: any, next: any) => {
  if (!req.isAuthenticated() || !req.user?.google_id) {
    return res.status(401).json({ 
      error: 'Authentication required',
      message: 'You must be logged in to access projects.'
    });
  }
  next();
};

// Input validation helpers
const validateProjectName = (name: string): string | null => {
  if (!name || typeof name !== 'string') {
    return 'Project name is required';
  }
  if (name.trim().length === 0) {
    return 'Project name cannot be empty';
  }
  if (name.length > 255) {
    return 'Project name must be 255 characters or less';
  }
  return null;
};

const validateProjectGoal = (goal: string): string | null => {
  if (goal && typeof goal === 'string' && goal.length > 2000) {
    return 'Project goal must be 2000 characters or less';
  }
  return null;
};

/**
 * POST /api/projects
 * Create a new project for the authenticated user
 */
router.post('/', requireAuth, async (req: any, res: any) => {
  try {
    const { name, goal } = req.body;
    const userId = req.user.google_id;

    // Validate input
    const nameError = validateProjectName(name);
    if (nameError) {
      return res.status(400).json({ error: 'Validation failed', message: nameError });
    }

    const goalError = validateProjectGoal(goal);
    if (goalError) {
      return res.status(400).json({ error: 'Validation failed', message: goalError });
    }

    // Create project in database
    const { data, error } = await supabase
      .from('projects')
      .insert({
        user_id: userId,
        name: name.trim(),
        goal: goal?.trim() || null
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating project:', error);
      return res.status(500).json({ 
        error: 'Database error', 
        message: 'Failed to create project. Please try again.' 
      });
    }

    console.log(`Project created: ${data.id} for user ${userId}`);
    res.status(201).json({
      success: true,
      project: data,
      message: 'Project created successfully'
    });

  } catch (error) {
    console.error('Unexpected error creating project:', error);
    res.status(500).json({ 
      error: 'Internal server error', 
      message: 'An unexpected error occurred while creating the project.' 
    });
  }
});

/**
 * GET /api/projects
 * List all projects for the authenticated user
 */
router.get('/', requireAuth, async (req: any, res: any) => {
  try {
    const userId = req.user.google_id;

    // Fetch user's projects, ordered by most recent first
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching projects:', error);
      return res.status(500).json({ 
        error: 'Database error', 
        message: 'Failed to fetch projects. Please try again.' 
      });
    }

    console.log(`Fetched ${data.length} projects for user ${userId}`);
    res.json({
      success: true,
      projects: data,
      count: data.length
    });

  } catch (error) {
    console.error('Unexpected error fetching projects:', error);
    res.status(500).json({ 
      error: 'Internal server error', 
      message: 'An unexpected error occurred while fetching projects.' 
    });
  }
});

/**
 * GET /api/projects/:id
 * Fetch details of a specific project (user can only access their own)
 */
router.get('/:id', requireAuth, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const userId = req.user.google_id;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return res.status(400).json({ 
        error: 'Invalid format', 
        message: 'Project ID must be a valid UUID.' 
      });
    }

    // Fetch project (security ensured by user_id filter)
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned - project doesn't exist or doesn't belong to user
        return res.status(404).json({ 
          error: 'Not found', 
          message: 'Project not found or access denied.' 
        });
      }
      console.error('Error fetching project:', error);
      return res.status(500).json({ 
        error: 'Database error', 
        message: 'Failed to fetch project details. Please try again.' 
      });
    }

    console.log(`Fetched project ${id} for user ${userId}`);
    res.json({
      success: true,
      project: data
    });

  } catch (error) {
    console.error('Unexpected error fetching project:', error);
    res.status(500).json({ 
      error: 'Internal server error', 
      message: 'An unexpected error occurred while fetching the project.' 
    });
  }
});

/**
 * PUT /api/projects/:id
 * Update a specific project (user can only update their own)
 */
router.put('/:id', requireAuth, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { name, goal } = req.body;
    const userId = req.user.google_id;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return res.status(400).json({ 
        error: 'Invalid format', 
        message: 'Project ID must be a valid UUID.' 
      });
    }

    // Validate input (only validate provided fields)
    if (name !== undefined) {
      const nameError = validateProjectName(name);
      if (nameError) {
        return res.status(400).json({ error: 'Validation failed', message: nameError });
      }
    }

    if (goal !== undefined) {
      const goalError = validateProjectGoal(goal);
      if (goalError) {
        return res.status(400).json({ error: 'Validation failed', message: goalError });
      }
    }

    // Build update object
    const updateData: any = {};
    if (name !== undefined) updateData.name = name.trim();
    if (goal !== undefined) updateData.goal = goal?.trim() || null;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ 
        error: 'No data provided', 
        message: 'At least one field (name or goal) must be provided for update.' 
      });
    }

    // Update project (security ensured by user_id filter)
    const { data, error } = await supabase
      .from('projects')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ 
          error: 'Not found', 
          message: 'Project not found or access denied.' 
        });
      }
      console.error('Error updating project:', error);
      return res.status(500).json({ 
        error: 'Database error', 
        message: 'Failed to update project. Please try again.' 
      });
    }

    console.log(`Updated project ${id} for user ${userId}`);
    res.json({
      success: true,
      project: data,
      message: 'Project updated successfully'
    });

  } catch (error) {
    console.error('Unexpected error updating project:', error);
    res.status(500).json({ 
      error: 'Internal server error', 
      message: 'An unexpected error occurred while updating the project.' 
    });
  }
});

/**
 * DELETE /api/projects/:id
 * Delete a specific project (user can only delete their own)
 * This will also trigger cleanup of associated data in future phases
 */
router.delete('/:id', requireAuth, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const userId = req.user.google_id;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return res.status(400).json({ 
        error: 'Invalid format', 
        message: 'Project ID must be a valid UUID.' 
      });
    }

    // First check if project exists and belongs to user
    const { data: existingProject, error: fetchError } = await supabase
      .from('projects')
      .select('id, name')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return res.status(404).json({ 
          error: 'Not found', 
          message: 'Project not found or access denied.' 
        });
      }
      console.error('Error checking project existence:', fetchError);
      return res.status(500).json({ 
        error: 'Database error', 
        message: 'Failed to verify project ownership. Please try again.' 
      });
    }

    // TODO: In Phase 2, add cleanup of associated vector data and chat history here
    
    // Delete the project
    const { error: deleteError } = await supabase
      .from('projects')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (deleteError) {
      console.error('Error deleting project:', deleteError);
      return res.status(500).json({ 
        error: 'Database error', 
        message: 'Failed to delete project. Please try again.' 
      });
    }

    console.log(`Deleted project ${id} (${existingProject.name}) for user ${userId}`);
    res.json({
      success: true,
      message: `Project "${existingProject.name}" deleted successfully`,
      deletedProject: {
        id: existingProject.id,
        name: existingProject.name
      }
    });

  } catch (error) {
    console.error('Unexpected error deleting project:', error);
    res.status(500).json({ 
      error: 'Internal server error', 
      message: 'An unexpected error occurred while deleting the project.' 
    });
  }
});

export default router;
