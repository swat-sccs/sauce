import { Router } from 'express';
import { logger } from '../util/logging';
import { catchErrors } from '../util/asyncCatch';
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
      data: docOrIndex,
    });
  }),
);

export const docRouter = router;
