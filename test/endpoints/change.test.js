const request = require('supertest');
const app = require('../../dist').default;
const utils = require('../utils');
const { telegram, bot } = require('../../dist/routers/public/changeRouter');

describe('/change', () => {
  beforeEach(async () => {
    await utils.syncDB();
    jest.restoreAllMocks();
  });

  afterAll(async () => {
    await app.locals.sessionStore.stopExpiringSessions();
    await utils.closeDB();
  });

  it('creating change works', async () => {
    await utils.createRestaurant(1);
    const response = await request(app)
    .post('/changes')
    .set('Accept', 'application/json')
    .send({
      modelName: 'Restaurant',
      modelFilter: { id: 1 },
      change: { address: 'New address' }
    })
    .expect(200);
    expect(Object.keys(response.body)).toEqual(['uuid']);
    const changes = await utils.models.Change.findAll();
    expect(changes.length).toBe(1);
    expect(changes[0].change.address).toBe('New address');
  });

  it('returns change by uuid', async () => {
    const agent = request.agent(app);
    await utils.createRestaurant(1);
    const createResponse = await agent
    .post('/changes')
    .set('Accept', 'application/json')
    .send({
      modelName: 'Restaurant',
      modelFilter: { id: 1 },
      change: { address: 'New address' }
    })
    .expect(200);
    let response = await agent
    .get(`/changes/${createResponse.body.uuid}`)
    .expect(200);
    expect(response.body[0].change).toEqual({ address: 'New address' });
    expect(response.body[0].appliedAt).toEqual(null);
  });

  describe('Telegram bot', () => {
    it('starts polling for updates', () => {
      expect(bot.startPolling).toHaveBeenCalled();
    });

    it('registers callback_query listener', () => {
      const { calls } = bot.on.mock;
      expect(calls[0][0]).toEqual('callback_query');
      expect(typeof calls[0][1]).toEqual('function');
    });

    it('adds username to appliedBy when applying', async () => {
      await utils.createRestaurant(1);
      const change = await utils.createChange({
        modelName: 'Restaurant',
        modelFilter: { id: 1 },
        change: {
          address: 'New address'
        }
      });
      await bot.on_callback({
        callbackQuery: {
          data: `accept:${change.uuid}`,
          from: {
            id: 123,
            username: 'Username'
          },
          message: {
            text: '📝 Change requested'
          }
        },
        editMessageText: async () => {},
        reply: async () => {}
      });
      const updatedChange = await utils.models.Change.findByPk(change.uuid);
      expect(updatedChange.appliedBy).toEqual('Username');
    });

    it('sends a message when creating a change', async () => {
      await utils.createRestaurant(1);
      await request(app)
      .post('/changes')
      .send({
        modelName: 'Restaurant',
        modelFilter: { id: 1 },
        change: { address: 'New address' }
      });
      expect(telegram.sendMessage).toHaveBeenCalled();
      const { calls } = telegram.sendMessage.mock;
      expect(typeof calls[0][0]).toEqual('number');
      expect(calls[0][1]).toContain('Change requested');
    });
  });
});
