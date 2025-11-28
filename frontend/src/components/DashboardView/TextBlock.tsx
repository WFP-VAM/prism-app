import React from 'react';
import { makeStyles } from '@mui/styles';
import { Box, Typography } from '@mui/material';
import { useDispatch, useSelector } from 'context/hooks';
import Markdown from 'react-markdown';
import { useSafeTranslation } from 'i18n';
import { DashboardMode } from 'config/types';
import {
  setTextContent,
  dashboardModeSelector,
} from '../../context/dashboardStateSlice';

interface TextBlockProps {
  label?: string;
  content: string;
  columnIndex: number;
  elementIndex: number;
}

const createMarkdownComponents = (classes: any): any => ({
  p: ({ children }: { children?: React.ReactNode }) => (
    <Typography variant="body1" className={classes.previewText}>
      {children}
    </Typography>
  ),
  h1: ({ children }: { children?: React.ReactNode }) => (
    <Typography variant="h4" className={classes.previewHeading}>
      {children}
    </Typography>
  ),
  h2: ({ children }: { children?: React.ReactNode }) => (
    <Typography variant="h5" className={classes.previewHeading}>
      {children}
    </Typography>
  ),
  h3: ({ children }: { children: React.ReactNode }) => (
    <Typography variant="h6" className={classes.previewHeading}>
      {children}
    </Typography>
  ),
  strong: ({ children }: { children: React.ReactNode }) => (
    <Typography component="span" style={{ fontWeight: 600 }}>
      {children}
    </Typography>
  ),
  em: ({ children }: { children: React.ReactNode }) => (
    <Typography component="span" style={{ fontStyle: 'italic' }}>
      {children}
    </Typography>
  ),
  a: ({ children, href }: { children: React.ReactNode; href?: string }) => (
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
});

function TextBlock({
  columnIndex,
  elementIndex,
  label = `Block #${elementIndex + 1}`,
  content,
}: TextBlockProps) {
  const dispatch = useDispatch();
  const classes = useStyles();
  const { t } = useSafeTranslation();
  const mode = useSelector(dashboardModeSelector);

  if (mode === DashboardMode.VIEW) {
    if (!content || content.trim() === '') {
      return null;
    }

    return (
      <Box className={classes.previewContainer}>
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
          ]}
        >
          {t(content)}
        </Markdown>
      </Box>
    );
  }

  return (
    <Box className={classes.grayCard}>
      <Typography variant="h3" className={classes.blockLabel}>
        {t(label)}
      </Typography>
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
