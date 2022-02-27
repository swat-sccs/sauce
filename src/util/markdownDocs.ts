import fs from 'fs';
import matter, { GrayMatterFile } from 'gray-matter';
import path from 'path';

import { logger } from './logging';

/**
 * Metadata for a markdown docs document or a docs index folder.
 */
interface DocumentOrIndex {
  /**
   * path for hyperlinking; no extensions.
   */
  hrefPath?: string;
  title: string;
  contents?: GrayMatterFile<Buffer>;
  /**
   * Immediate parents at the front of the list, grandparents at the back.
   * e.g. a file at /foo/bar/baz.md would have parents: [bar, foo]
   */
  parents?: DocumentOrIndex[];
  children?: DocumentOrIndex[];
}

const getParents = (docFile: string): DocumentOrIndex[] => {
  logger.debug(`Getting parents of ${docFile}`);
  const parent = path.dirname(docFile).replace(/\/|\./, '');

  if (parent) {
    let parentData = getDocsData(parent, false);
    if (!parentData) {
      parentData = {
        title: path.basename(parent),
      };
    }

    return (parentData ? [parentData] : []).concat(getParents(parent));
  } else {
    // no parents
    return [{ hrefPath: '/docs/', title: 'Docs' }];
  }
};

export const getDocsData = (docFile: string, recurse = true): DocumentOrIndex => {
  const dirPath = path.join('_docs/', docFile.replace(/^\//, '').replace(/\/$/, ''));
  const filePath = dirPath + '.md';

  logger.debug(`Looking for docs file at ${filePath}`);
  if (fs.existsSync(filePath)) {
    logger.debug('Found docs file');
    const fileContents = matter(fs.readFileSync(filePath));
    const fileData: DocumentOrIndex = {
      hrefPath: docFile,
      title: fileContents.data.title || path.basename(docFile),
      contents: fileContents,
    };

    if (recurse) {
      fileData.parents = getParents(docFile);
    }

    return fileData;
  } else {
    if (fs.existsSync(dirPath) && fs.lstatSync(dirPath).isDirectory) {
      const indexPath = path.join(dirPath, 'index.md');
      logger.debug(`Looking for ${indexPath}`);
      if (fs.existsSync(indexPath)) {
        logger.debug('Found index file');
        const fileContents = matter(fs.readFileSync(indexPath));

        const fileData: DocumentOrIndex = {
          hrefPath: docFile,
          title: fileContents.data.title || path.basename(docFile),
          contents: fileContents,
        };

        if (recurse) {
          fileData.parents = getParents(docFile);
        }

        return fileData;
      }
    } else {
      logger.warn(`File and index-file missing for ${dirPath}`);
      return null;
    }
  }
};
