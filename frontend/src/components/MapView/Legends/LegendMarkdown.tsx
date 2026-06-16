import { createStyles, makeStyles, Typography } from '@material-ui/core';
import { ClassNameMap } from '@material-ui/styles';
import React from 'react';
import Markdown from 'react-markdown';

interface LegendMarkdownProps {
  children: string;
}

const p = (classes: ClassNameMap<'legendTextMarkdown'>) =>
  function _p({ children: pChildren }: { children: React.ReactNode }) {
    return (
      <Typography variant="h5" className={classes.legendTextMarkdown}>
        {pChildren}
      </Typography>
    );
  };

const a = (classes: ClassNameMap<'legendLink'>) =>
  function _a({
    children: linkChildren,
    href,
  }: {
    children: React.ReactNode;
    href?: string;
  }) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={classes.legendLink}
      >
        {linkChildren}
      </a>
    );
  };

function LegendMarkdown({ children }: LegendMarkdownProps) {
  const classes = useStyles();
  return (
    <Markdown
      components={{
        p: p(classes),
        a: a(classes),
      }}
      allowedElements={['p', 'h5', 'strong', 'em', 'a']}
    >
      {children}
    </Markdown>
  );
}

const useStyles = makeStyles(() =>
  createStyles({
    legendTextMarkdown: {
      '& a': {
        textDecoration: 'underline',
      },
    },
    legendLink: {
      textDecoration: 'underline',
    },
  }),
);

export default LegendMarkdown;
