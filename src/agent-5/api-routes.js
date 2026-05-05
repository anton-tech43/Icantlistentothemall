// Agent 5 — API route handlers for newsletter approval, confirmation, and unsubscribe
// These handlers are called by the Railway worker's HTTP server (Express/Fastify).
// Agent 5 provides the handlers; the worker framework wires them to routes.

const { handleSignup, handleConfirmation } = require('./double-opt-in');
const { handleUnsubscribe } = require('./unsubscribe');
const { handleApprove, handleHold } = require('./newsletter-send');

async function confirmRoute(req, res) {
  const token = req.query.token;
  const result = await handleConfirmation(token);

  if (!result.success) {
    return res.status(400).send(result.error);
  }

  return res.redirect(302, result.redirectUrl);
}

async function signupRoute(req, res) {
  const email = req.body?.email;
  if (!email) return res.status(400).json({ error: 'Email required' });

  const result = await handleSignup(email);
  return res.json(result);
}

async function unsubscribeRoute(req, res) {
  const email = req.query.email;
  if (!email) return res.status(400).send('Missing email');

  const result = handleUnsubscribe(email);
  if (result.success) {
    return res.send('You have been unsubscribed.');
  }
  return res.status(400).send(result.error);
}

async function newsletterApproveRoute(req, res) {
  const id = req.query.id;
  if (!id) return res.status(400).send('Missing newsletter ID');

  const result = await handleApprove(id);
  if (result.success) {
    return res.send(`Newsletter approved and sent to ${result.sent} subscriber(s).`);
  }
  return res.status(400).send(result.error);
}

async function newsletterHoldRoute(req, res) {
  const id = req.query.id;
  if (!id) return res.status(400).send('Missing newsletter ID');

  const result = await handleHold(id);
  if (result.success) {
    return res.send(result.message);
  }
  return res.status(400).send(result.error);
}

module.exports = {
  confirmRoute,
  signupRoute,
  unsubscribeRoute,
  newsletterApproveRoute,
  newsletterHoldRoute,
};
