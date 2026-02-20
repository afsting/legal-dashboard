const Package = require('../models/Package');

const packageController = {
  async create(req, res) {
    try {
      const { clientId, fileNumberId, name, description, recipient, type, status, documents } = req.body;

      if (!clientId || !name) {
        return res.status(400).json({ error: 'ClientId and name are required' });
      }

      const pkg = await Package.create(clientId, {
        fileNumberId,
        name,
        description,
        recipient,
        type,
        status,
        documents,
      });

      res.status(201).json(pkg);
    } catch (error) {
      console.error('Create package error:', error);
      res.status(500).json({ error: 'Failed to create package' });
    }
  },

  async getById(req, res) {
    try {
      const { packageId } = req.params;
      const pkg = await Package.getById(packageId);

      if (!pkg) {
        return res.status(404).json({ error: 'Package not found' });
      }

      res.json(pkg);
    } catch (error) {
      console.error('Get package error:', error);
      res.status(500).json({ error: 'Failed to retrieve package' });
    }
  },

  async getByClientId(req, res) {
    try {
      const { clientId } = req.params;
      const packages = await Package.getByClientId(clientId);

      res.json(packages);
    } catch (error) {
      console.error('Get packages by client error:', error);
      res.status(500).json({ error: 'Failed to retrieve packages' });
    }
  },

  async getByFileNumberId(req, res) {
    try {
      const { fileNumberId } = req.params;
      const packages = await Package.getByFileNumberId(fileNumberId);

      res.json(packages);
    } catch (error) {
      console.error('Get packages by file number error:', error);
      res.status(500).json({ error: 'Failed to retrieve packages' });
    }
  },

  async update(req, res) {
    try {
      const { packageId } = req.params;
      const updates = req.body;

      const pkg = await Package.update(packageId, updates);

      if (!pkg) {
        return res.status(404).json({ error: 'Package not found' });
      }

      res.json(pkg);
    } catch (error) {
      console.error('Update package error:', error);
      res.status(500).json({ error: 'Failed to update package' });
    }
  },

  async delete(req, res) {
    try {
      const { packageId } = req.params;

      await Package.delete(packageId);
      res.status(204).send();
    } catch (error) {
      console.error('Delete package error:', error);
      res.status(500).json({ error: 'Failed to delete package' });
    }
  },
};

module.exports = packageController;
