import {
  Typography,
  WithStyles,
  createStyles,
  withStyles,
} from '@material-ui/core';
import { ClassNameMap } from '@material-ui/styles';
import React from 'react';
import Markdown from 'react-markdown';

interface LegendMarkdownProps extends WithStyles<typeof styles> {
  children: string;
}

// TODO: ?
const p = (classes: ClassNameMap<'legendTextMarkdown'>) =>
  function _p({ children: pChildren }: { children: React.ReactNode }) {
    return (
      <Typography variant="h5" className={classes.legendTextMarkdown}>
        {pChildren}
      </Typography>
    );
  };

function LegendMarkdown({ children, classes }: LegendMarkdownProps) {
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

const styles = () =>
  createStyles({
    legendTextMarkdown: {
      '& a': {
        textDecoration: 'underline',
      },
    },
  });

export default withStyles(styles)(LegendMarkdown);
