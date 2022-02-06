import { logger } from './logging';
import fs from 'fs';
import path, { dirname } from 'path';
import matter, { GrayMatterFile } from 'gray-matter';

/**
 * Metadata for a markdown docs document or a docs index folder.
 */
interface DocumentOrIndex {
  /**
   * path for hyperlinking; no extensions.
   */
  hrefPath: string;
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
  const parent = path.dirname(docFile).replace(/\/|\./, '');
  console.log(parent);
  if (parent) {
    return [getDocsData(parent, false)].concat(getParents(parent));
  } else {
    // no parents
    return [];
  }
};

export const getDocsData = (docFile: string, recurse = true): DocumentOrIndex => {
  const dirPath = path.join('_docs/', docFile.replace(/^\//, '').replace(/\/$/, ''));
  const filePath = dirPath + '.md';

  logger.debug(`Looking for docs file at ${filePath}`);
  if (fs.existsSync(filePath)) {
    const fileContents = matter(fs.readFileSync(filePath));
    logger.debug('Found docs file');
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
    logger.debug(`Looking for index dir at ${dirPath}`);
    if (fs.existsSync(dirPath) && fs.lstatSync(dirPath).isDirectory) {
      logger.debug('Found index dir');

      if (recurse) {
        return {
          hrefPath: docFile,
          title: path.basename(docFile) || 'Index',
          children: fs
            .readdirSync(dirPath)
            .map((filename) => path.basename(filename, '.md'))
            .map((filename) => getDocsData(path.join(docFile, filename), false)),
          parents: getParents(docFile),
        };
      } else {
        return {
          hrefPath: docFile,
          title: path.basename(docFile) || 'Index',
        };
      }
    } else {
      logger.warn(`Index dir and file missing for ${dirPath}`);
      return null;
    }
  }
};
