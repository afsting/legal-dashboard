const Client = require('../models/Client');

const clientController = {
  async create(req, res) {
    try {
      const { name, email, phone, address, status } = req.body;
      const userId = req.user.userId;

      if (!name || !email) {
        return res.status(400).json({ error: 'Name and email are required' });
      }

      const client = await Client.create(userId, {
        name,
        email,
        phone,
        address,
        status,
      });

      res.status(201).json(client);
    } catch (error) {
      console.error('Create client error:', error);
      res.status(500).json({ error: 'Failed to create client' });
    }
  },

  async getById(req, res) {
    try {
      const { clientId } = req.params;
      const client = await Client.getById(clientId);

      if (!client) {
        return res.status(404).json({ error: 'Client not found' });
      }

      res.json(client);
    } catch (error) {
      console.error('Get client error:', error);
      res.status(500).json({ error: 'Failed to retrieve client' });
    }
  },

  async getAll(req, res) {
    try {
      const userId = req.user.userId;
      const clients = await Client.getByUserId(userId);

      res.json(clients);
    } catch (error) {
      console.error('Get all clients error:', error);
      res.status(500).json({ error: 'Failed to retrieve clients' });
    }
  },

  async update(req, res) {
    try {
      const { clientId } = req.params;
      const updates = req.body;

      const client = await Client.update(clientId, updates);

      if (!client) {
        return res.status(404).json({ error: 'Client not found' });
      }

      res.json(client);
    } catch (error) {
      console.error('Update client error:', error);
      res.status(500).json({ error: 'Failed to update client' });
    }
  },

  async delete(req, res) {
    try {
      const { clientId } = req.params;

      await Client.delete(clientId);
      res.status(204).send();
    } catch (error) {
      console.error('Delete client error:', error);
      res.status(500).json({ error: 'Failed to delete client' });
    }
  },
};

module.exports = clientController;
