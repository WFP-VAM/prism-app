import { Box, Typography } from '@mui/material';
import type { ReactNode } from 'react';
import Markdown, { type Components } from 'react-markdown';

import { legendBodyTextSx, legendLinkSx } from './legendStyles';

interface LegendMarkdownProps {
  children: string;
}

function LegendParagraph({ children }: { children?: ReactNode }) {
  return (
    <Typography variant="h5" component="p" sx={legendBodyTextSx}>
      {children}
    </Typography>
  );
}

function LegendMarkdown({ children }: LegendMarkdownProps) {
  const components: Components = {
    p: LegendParagraph,
    a: ({ children: linkChildren, href }) => (
      <Typography
        component="a"
        variant="h5"
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        sx={legendLinkSx}
      >
        {linkChildren}
      </Typography>
    ),
  };

  return (
    <Box sx={{ overflow: 'visible' }}>
      <Markdown
        components={components}
        allowedElements={['p', 'h5', 'strong', 'em', 'a', 'br']}
      >
        {children}
      </Markdown>
    </Box>
  );
}

export default LegendMarkdown;
