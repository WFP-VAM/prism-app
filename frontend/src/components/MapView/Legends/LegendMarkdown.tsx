import { createStyles, makeStyles, Typography } from '@material-ui/core';
import { ClassNameMap } from '@material-ui/styles';
import Markdown, { type Components } from 'react-markdown';

interface LegendMarkdownProps {
  children: string;
}

const p = (
  classes: ClassNameMap<'legendTextMarkdown'>,
): NonNullable<Components['p']> =>
  function LegendParagraph({ children }) {
    return (
      <Typography variant="h5" className={classes.legendTextMarkdown}>
        {children}
      </Typography>
    );
  };

function LegendMarkdown({ children }: LegendMarkdownProps) {
  const classes = useStyles();
  const components: Components = {
    p: p(classes),
    a: ({ children: linkChildren, href }) => (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={classes.legendLink}
      >
        {linkChildren}
      </a>
    ),
  };

  return (
    <Markdown
      components={components}
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
