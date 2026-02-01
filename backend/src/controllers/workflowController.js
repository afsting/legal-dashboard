const Workflow = require('../models/Workflow');

const workflowController = {
  async create(req, res) {
    try {
      const { packageId, name, description, status, steps, currentStep } = req.body;

      if (!packageId || !name) {
        return res.status(400).json({ error: 'PackageId and name are required' });
      }

      const workflow = await Workflow.create(packageId, {
        name,
        description,
        status,
        steps,
        currentStep,
      });

      res.status(201).json(workflow);
    } catch (error) {
      console.error('Create workflow error:', error);
      res.status(500).json({ error: 'Failed to create workflow' });
    }
  },

  async getById(req, res) {
    try {
      const { workflowId } = req.params;
      const workflow = await Workflow.getById(workflowId);

      if (!workflow) {
        return res.status(404).json({ error: 'Workflow not found' });
      }

      res.json(workflow);
    } catch (error) {
      console.error('Get workflow error:', error);
      res.status(500).json({ error: 'Failed to retrieve workflow' });
    }
  },

  async getByPackageId(req, res) {
    try {
      const { packageId } = req.params;
      const workflows = await Workflow.getByPackageId(packageId);

      res.json(workflows);
    } catch (error) {
      console.error('Get workflows by package error:', error);
      res.status(500).json({ error: 'Failed to retrieve workflows' });
    }
  },

  async update(req, res) {
    try {
      const { workflowId } = req.params;
      const updates = req.body;

      const workflow = await Workflow.update(workflowId, updates);

      if (!workflow) {
        return res.status(404).json({ error: 'Workflow not found' });
      }

      res.json(workflow);
    } catch (error) {
      console.error('Update workflow error:', error);
      res.status(500).json({ error: 'Failed to update workflow' });
    }
  },

  async delete(req, res) {
    try {
      const { workflowId } = req.params;

      await Workflow.delete(workflowId);
      res.status(204).send();
    } catch (error) {
      console.error('Delete workflow error:', error);
      res.status(500).json({ error: 'Failed to delete workflow' });
    }
  },
};

module.exports = workflowController;
