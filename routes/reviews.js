const express = require('express');
const authenticateToken = require('../middleware/auth');
const {
  listRepoSettings,
  listReviewHistory,
  upsertRepoSettings,
} = require('../data/store');

const router = express.Router();

// Retrieve pull request review logs scoped to the authenticated user.
router.get('/reviews', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.sub ? parseInt(req.user.sub, 10) : null;
    if (!userId) {
      return res.status(401).json({ error: 'User context is missing' });
    }
    const reviews = await listReviewHistory(100, userId);
    return res.json(reviews);
  } catch (error) {
    console.error('Failed to fetch review history:', error.message);
    return res.status(500).json({ error: 'Failed to retrieve review history' });
  }
});

// Retrieve aggregated metrics, repository configurations, and reviews for the user dashboard.
router.get('/dashboard-data', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.sub ? parseInt(req.user.sub, 10) : null;
    if (!userId) {
      return res.status(401).json({ error: 'User context is missing' });
    }
    const [repos, reviews] = await Promise.all([
      listRepoSettings(userId),
      listReviewHistory(100, userId),
    ]);

    const metrics = {
      totalRepos: repos.length,
      activeRepos: repos.filter(repo => repo.active).length,
      strictRepos: repos.filter(repo => repo.strict_mode).length,
      recentReviews: reviews.length,
    };

    return res.json({ metrics, reviews, repos });
  } catch (error) {
    console.error('Failed to fetch dashboard data:', error.message);
    return res.status(500).json({ error: 'Failed to retrieve dashboard metrics' });
  }
});

// Update or create repository settings, associating it with the authenticated user.
router.post('/repos/settings', authenticateToken, async (req, res) => {
  try {
    const { repo_full_name, strict_mode, ignore_linter, active } = req.body;
    const userId = req.user?.sub ? parseInt(req.user.sub, 10) : null;

    if (!userId) {
      return res.status(401).json({ error: 'User context is missing' });
    }

    if (!repo_full_name) {
      return res.status(400).json({ error: 'Repository name is required' });
    }

    await upsertRepoSettings({
      repoFullName: repo_full_name.trim(),
      strictMode: !!strict_mode,
      ignoreLinter: !!ignore_linter,
      active: active !== false,
      userId,
    });

    return res.json({ message: 'Repository settings saved successfully' });
  } catch (error) {
    console.error('Failed to update repository settings:', error.message);
    return res.status(500).json({ error: 'Failed to update repository settings' });
  }
});

module.exports = router;
