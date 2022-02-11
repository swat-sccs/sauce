import { existsSync, promises as fsPromises } from 'fs';
import matter, { GrayMatterFile } from 'gray-matter';
import path from 'path';
import { logger } from './logging';
import { marked } from 'marked';

interface PostFile extends GrayMatterFile<Buffer> {
  data: {
    date: Date;
    title: string;
  };
}

const isPostFile = (file: GrayMatterFile<Buffer>): file is PostFile => {
  return file.data.date && file.data.title;
};

export const getPosts = async (): Promise<PostFile[] | null> => {
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
      .filter(isPostFile)
      .sort((a, b) => b.data.date.getTime() - a.data.date.getTime()); // sort in descending order
    logger.debug(`Found ${parsedFiles.length} posts`);

    if (parsedFiles.length === 0) {
      return null;
    } else {
      return parsedFiles;
    }
  } else {
    logger.debug(`Post folder ${postsPath} does not exist`);
    return null;
  }
};
