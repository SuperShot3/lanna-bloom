import type { HTMLAttributes } from 'react';

/** Table elements for info guide MDX — use with global `.info-article-table*` styles. */
export const infoArticleTableMdxComponents = {
  table: (props: HTMLAttributes<HTMLTableElement>) => (
    <div className="info-article-table-wrap">
      <table className="info-article-table" {...props} />
    </div>
  ),
  thead: (props: HTMLAttributes<HTMLTableSectionElement>) => (
    <thead className="info-article-thead" {...props} />
  ),
  tbody: (props: HTMLAttributes<HTMLTableSectionElement>) => (
    <tbody className="info-article-tbody" {...props} />
  ),
  tr: (props: HTMLAttributes<HTMLTableRowElement>) => (
    <tr className="info-article-tr" {...props} />
  ),
  th: (props: HTMLAttributes<HTMLTableCellElement>) => (
    <th className="info-article-th" {...props} />
  ),
  td: (props: HTMLAttributes<HTMLTableCellElement>) => (
    <td className="info-article-td" {...props} />
  ),
};
