const FileNumber = require('../models/FileNumber');

const fileNumberController = {
  async create(req, res) {
    try {
      const { packageId, clientId, fileNumber, description, status } = req.body;

      if ((!packageId && !clientId) || !fileNumber) {
        return res.status(400).json({ error: 'PackageId or clientId, and fileNumber are required' });
      }

      const file = await FileNumber.create({
        packageId: packageId || null,
        clientId: clientId || null,
        fileNumber,
        description,
        status,
      });

      res.status(201).json(file);
    } catch (error) {
      console.error('Create file number error:', error);
      res.status(500).json({ error: 'Failed to create file number' });
    }
  },

  async getByClientId(req, res) {
    try {
      const { clientId } = req.params;
      const files = await FileNumber.getByClientId(clientId);

      res.json(files);
    } catch (error) {
      console.error('Get file numbers by client error:', error);
      res.status(500).json({ error: 'Failed to retrieve file numbers' });
    }
  },

  async getById(req, res) {
    try {
      const { fileId } = req.params;
      const file = await FileNumber.getById(fileId);

      if (!file) {
        return res.status(404).json({ error: 'File number not found' });
      }

      res.json(file);
    } catch (error) {
      console.error('Get file number error:', error);
      res.status(500).json({ error: 'Failed to retrieve file number' });
    }
  },

  async getByPackageId(req, res) {
    try {
      const { packageId } = req.params;
      const files = await FileNumber.getByPackageId(packageId);

      res.json(files);
    } catch (error) {
      console.error('Get file numbers by package error:', error);
      res.status(500).json({ error: 'Failed to retrieve file numbers' });
    }
  },

  async update(req, res) {
    try {
      const { fileId } = req.params;
      const updates = req.body;

      const file = await FileNumber.update(fileId, updates);

      if (!file) {
        return res.status(404).json({ error: 'File number not found' });
      }

      res.json(file);
    } catch (error) {
      console.error('Update file number error:', error);
      res.status(500).json({ error: 'Failed to update file number' });
    }
  },

  async delete(req, res) {
    try {
      const { fileId } = req.params;

      await FileNumber.delete(fileId);
      res.status(204).send();
    } catch (error) {
      console.error('Delete file number error:', error);
      res.status(500).json({ error: 'Failed to delete file number' });
    }
  },
};

module.exports = fileNumberController;
