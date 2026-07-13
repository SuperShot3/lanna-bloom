import remarkGfm from 'remark-gfm';

/** Shared MDX compile options for info guides (tables, strikethrough, etc.). */
export const infoArticleMdxOptions = {
  mdxOptions: {
    remarkPlugins: [remarkGfm],
  },
};
