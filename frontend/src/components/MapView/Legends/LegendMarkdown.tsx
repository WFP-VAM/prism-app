import {
  Typography,
  WithStyles,
  createStyles,
  withStyles,
} from '@material-ui/core';
import React from 'react';
import Markdown from 'react-markdown';

interface LegendMarkdownProps extends WithStyles<typeof styles> {
  children: string;
}

const LegendMarkdown = ({ children, classes }: LegendMarkdownProps) => (
  <Markdown
    linkTarget="_blank"
    components={{
      p: ({ children: pChildren }: { children: React.ReactNode }) => (
        <Typography variant="h5" className={classes.legendTextMarkdown}>
          {pChildren}
        </Typography>
      ),
    }}
    allowedElements={['p', 'h5', 'strong', 'em', 'a']}
  >
    {children}
  </Markdown>
);

const styles = () =>
  createStyles({
    legendTextMarkdown: {
      '& a': {
        textDecoration: 'underline',
      },
    },
  });

export default withStyles(styles)(LegendMarkdown);
