import { Box, Typography } from '@mui/material';
import type { ReactNode } from 'react';
import Markdown, { type Components } from 'react-markdown';

import { legendBodyTextSx, legendLinkSx } from './legendStyles';

interface LegendMarkdownProps {
  children: string;
}

function LegendParagraph({ children }: { children?: ReactNode }) {
  return (
    <Typography variant="h5" sx={legendBodyTextSx}>
      {children}
    </Typography>
  );
}

function LegendMarkdown({ children }: LegendMarkdownProps) {
  const components: Components = {
    p: LegendParagraph,
    a: ({ children: linkChildren, href }) => (
      <Box
        component="a"
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        sx={legendLinkSx}
      >
        {linkChildren}
      </Box>
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

export default LegendMarkdown;
