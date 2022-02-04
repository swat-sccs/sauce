import { existsSync, promises as fsPromises } from 'fs';
import matter from 'gray-matter';
import path from 'path';
import { logger } from '../../agent/src/api';
import { marked } from 'marked';

export const getPosts = async () => {
  const postsPath = path.join('./', process.env.POSTS_DIR || '_posts/');
  logger.debug(`Reading posts from ${postsPath}`);

  if (existsSync(postsPath)) {
    const files = await fsPromises.readdir(postsPath);

    const parsedFiles = (
      await Promise.all(
        files.map(async (file) => {
          const fileData = matter(await fsPromises.readFile(path.join(postsPath, file)));
          fileData.content = marked(fileData.content);
          if (fileData.excerpt) {
            fileData.excerpt = marked(fileData.excerpt);
          }
          if (!fileData.data.date) {
            logger.warn(`${file} is missing required front matter: date`);
          }
          if (!fileData.data.title) {
            logger.warn(`${file} is missing required front matter: title`);
          }
          return fileData;
        }),
      )
    )
      .filter((file) => file.data.date && file.data.title)
      .sort((a, b) => b.data.date.getTime() - a.data.date.getTime()); // sort in descending order
    logger.debug(`Found ${parsedFiles.length} posts`);

    return parsedFiles;
  } else {
    logger.debug(`Post folder ${postsPath} does not exist`);
    return [];
  }
};
