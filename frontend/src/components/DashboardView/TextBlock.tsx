import { Box, Typography } from '@mui/material';
import { DashboardMode } from 'config/types';
import { useSafeTranslation } from 'i18n';
import { type ReactNode } from 'react';
import Markdown, { type Components } from 'react-markdown';
import { useDispatch, useSelector } from 'react-redux';

import {
  dashboardModeSelector,
  setTextContent,
} from '../../context/dashboardStateSlice';
import {
  textBlockEmptyStateSx,
  textBlockGrayCardSx,
  textBlockLabelSx,
  textBlockPreviewContainerSx,
  textBlockPreviewHeadingSx,
  textBlockPreviewTextSx,
  textBlockTextareaSx,
} from './textBlockStyles';

interface TextBlockProps {
  label?: string;
  content: string;
  columnIndex: number;
  elementIndex: number;
  headerSlot?: ReactNode;
}

const markdownComponents: Components = {
  p: ({ children }) => (
    <Typography variant="body1" sx={textBlockPreviewTextSx}>
      {children}
    </Typography>
  ),
  h1: ({ children }) => (
    <Typography variant="h4" sx={textBlockPreviewHeadingSx}>
      {children}
    </Typography>
  ),
  h2: ({ children }) => (
    <Typography variant="h5" sx={textBlockPreviewHeadingSx}>
      {children}
    </Typography>
  ),
  h3: ({ children }) => (
    <Typography variant="h6" sx={textBlockPreviewHeadingSx}>
      {children}
    </Typography>
  ),
  strong: ({ children }) => (
    <Typography component="span" style={{ fontWeight: 600 }}>
      {children}
    </Typography>
  ),
  em: ({ children }) => (
    <Typography component="span" style={{ fontStyle: 'italic' }}>
      {children}
    </Typography>
  ),
  a: ({ children, href }) => (
    <Typography
      component="a"
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      style={{ color: '#1976d2', textDecoration: 'underline' }}
    >
      {children}
    </Typography>
  ),
  img: ({ src, alt }) => (
    <img
      src={src}
      alt={alt || ''}
      style={{ maxWidth: '100%', height: 'auto' }}
    />
  ),
};

function TextBlock({
  columnIndex,
  elementIndex,
  label = `Block #${elementIndex + 1}`,
  content,
  headerSlot,
}: TextBlockProps) {
  const dispatch = useDispatch();
  const { t } = useSafeTranslation();
  const mode = useSelector(dashboardModeSelector);

  if (mode === DashboardMode.VIEW) {
    return (
      <Box sx={textBlockPreviewContainerSx}>
        {content && content.trim() !== '' ? (
          <Markdown
            components={markdownComponents}
            allowedElements={[
              'p',
              'h1',
              'h2',
              'h3',
              'strong',
              'em',
              'a',
              'ul',
              'ol',
              'li',
              'img',
            ]}
          >
            {t(content)}
          </Markdown>
        ) : (
          <Box sx={textBlockEmptyStateSx}>
            <Typography variant="body1" color="textSecondary" align="center">
              {t('No text configured')}
            </Typography>
          </Box>
        )}
      </Box>
    );
  }

  return (
    <Box sx={textBlockGrayCardSx}>
      {headerSlot ?? (
        <Typography variant="h3" sx={textBlockLabelSx}>
          {t(label)}
        </Typography>
      )}
      <Box
        component="textarea"
        name="text-block"
        sx={textBlockTextareaSx}
        placeholder={t('Add custom text here')}
        value={content}
        onChange={e =>
          dispatch(
            setTextContent({
              columnIndex,
              elementIndex,
              content: e.target.value,
            }),
          )
        }
      />
    </Box>
  );
}

export default TextBlock;
