import { Router } from 'express';
import { logger } from '../../agent/src/api';
import { catchErrors } from '../util/asyncCatch';
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { marked } from 'marked';
import { getDocsData } from '../util/markdownDocs';

const router = Router(); // eslint-disable-line new-cap

router.get(
  '/*',
  catchErrors((req, res, next) => {
    const localPath = req.path;

    logger.debug(`Looking for docs file at ${localPath}`);

    const docOrIndex = getDocsData(localPath);

    if (!docOrIndex) {
      return next(); // go to 404 page
    }

    if (docOrIndex.contents?.content) {
      docOrIndex.contents.content = marked(docOrIndex.contents.content);
    }

    return res.render('docPage', {
      user: req.user,
      data: docOrIndex,
    });
  }),
);

export const docRouter = router;
