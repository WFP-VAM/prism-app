import { Box, makeStyles, Typography } from '@material-ui/core';
import { DashboardMode } from 'config/types';
import { useSafeTranslation } from 'i18n';
import { type ReactNode } from 'react';
import Markdown, { type Components } from 'react-markdown';
import { useDispatch, useSelector } from 'react-redux';

import {
  dashboardModeSelector,
  setTextContent,
} from '../../context/dashboardStateSlice';

interface TextBlockProps {
  label?: string;
  content: string;
  columnIndex: number;
  elementIndex: number;
  headerSlot?: ReactNode;
}

const createMarkdownComponents = (classes: any): Components => ({
  p: ({ children }) => (
    <Typography variant="body1" className={classes.previewText}>
      {children}
    </Typography>
  ),
  h1: ({ children }) => (
    <Typography variant="h4" className={classes.previewHeading}>
      {children}
    </Typography>
  ),
  h2: ({ children }) => (
    <Typography variant="h5" className={classes.previewHeading}>
      {children}
    </Typography>
  ),
  h3: ({ children }) => (
    <Typography variant="h6" className={classes.previewHeading}>
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
});

function TextBlock({
  columnIndex,
  elementIndex,
  label = `Block #${elementIndex + 1}`,
  content,
  headerSlot,
}: TextBlockProps) {
  const dispatch = useDispatch();
  const classes = useStyles();
  const { t } = useSafeTranslation();
  const mode = useSelector(dashboardModeSelector);

  if (mode === DashboardMode.VIEW) {
    return (
      <Box className={classes.previewContainer}>
        {content && content.trim() !== '' ? (
          <Markdown
            components={createMarkdownComponents(classes)}
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
          <Box className={classes.emptyState}>
            <Typography variant="body1" color="textSecondary" align="center">
              {t('No text configured')}
            </Typography>
          </Box>
        )}
      </Box>
    );
  }

  return (
    <Box className={classes.grayCard}>
      {headerSlot ?? (
        <Typography variant="h3" className={classes.blockLabel}>
          {t(label)}
        </Typography>
      )}
      <textarea
        name="text-block"
        className={classes.textarea}
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

const useStyles = makeStyles(() => ({
  grayCard: {
    background: '#F1F1F1',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  blockLabel: {
    fontWeight: 600,
    fontSize: 16,
    marginBottom: 12,
  },
  emptyState: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
  },
  textarea: {
    width: '95%',
    minHeight: 120,
    padding: '12px',
    borderRadius: 4,
    fontSize: 14,
    border: 'none',
    outline: 'none',
    background: 'white',
    fontFamily: 'Roboto',
    resize: 'vertical',
  },
  previewContainer: {
    background: 'white',
    borderRadius: 8,
    padding: 16,
    maxWidth: '100%',
    overflow: 'auto',
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    minHeight: 0,
    '& *:last-child': {
      marginBottom: 0,
    },
  },
  previewText: {
    fontSize: 14,
    lineHeight: 1.6,
    margin: '0 0 12px 0',
  },
  previewHeading: {
    fontWeight: 600,
    margin: '16px 0 8px 0',
    '&:first-child': {
      marginTop: 0,
    },
  },
}));

export default TextBlock;
