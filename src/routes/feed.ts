import { Router } from 'express';

import { getPosts } from '../util/markdownPosts';
import { catchErrors } from '../util/asyncCatch';
import { logger } from '../util/logging';

const router = Router(); // eslint-disable-line new-cap

router.get(
  '/*',
  catchErrors(async (req: any, res) => {
    return res.render('feed', { posts: await getPosts() });
  }),
);

export const feedRouter = router;
