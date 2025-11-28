import {Typography} from '@mui/material';
import { ClassNameMap, makeStyles, createStyles } from '@mui/styles';
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

function LegendMarkdown({ children }: LegendMarkdownProps) {
  const classes = useStyles();
  return (
    <Markdown
      linkTarget="_blank"
      components={{
        p: p(classes),
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
  }),
);

export default LegendMarkdown;
