import { useCallback, useState, MouseEvent, memo, useMemo } from 'react';
import InfoOutlinedIcon from '@material-ui/icons/InfoOutlined';
import {
  Button,
  IconButton,
  Typography,
  useMediaQuery,
  useTheme,
} from '@material-ui/core';
import { useDispatch } from 'react-redux';
import { appConfig } from 'config';
import ContentDialog from 'components/NavBar/ContentDialog';
import { useSafeTranslation } from 'i18n';
import { loadLayerContent } from 'utils/load-layer-utils';

const About = memo(() => {
  const [content, setContent] = useState<string | undefined>(undefined);
  const { t } = useSafeTranslation();
  const { aboutPath } = appConfig;
  const dispatch = useDispatch();
  const theme = useTheme();
  const smDown = useMediaQuery(theme.breakpoints.down('sm'));
  const mdUp = useMediaQuery(theme.breakpoints.up('md'));

  const href = aboutPath ? '' : 'https://innovation.wfp.org/project/prism';

  const handler = useCallback(
    async (event: MouseEvent<HTMLAnchorElement>) => {
      if (!aboutPath) {
        return;
      }
      event.preventDefault();
      const layerContent = await loadLayerContent(aboutPath, dispatch);
      setContent(layerContent);
    },
    [aboutPath, dispatch],
  );

  const handleDialogClose = useCallback(() => {
    setContent(undefined);
  }, []);

  const renderedContentDialog = useMemo(() => {
    if (!content) {
      return null;
    }
    return <ContentDialog content={content} handleClose={handleDialogClose} />;
  }, [content, handleDialogClose]);

  const icon = (
    <InfoOutlinedIcon style={{ fontSize: mdUp ? '1.25rem' : '1.5rem' }} />
  );

  return (
    <>
      {smDown ? (
        <IconButton
          key="About"
          component={aboutPath ? 'button' : 'a'}
          target={aboutPath ? undefined : '_blank'}
          href={aboutPath ? undefined : href}
          onClick={handler}
          style={{ color: 'white' }}
          aria-label={t('About')}
        >
          {icon}
        </IconButton>
      ) : (
        <Button
          key="About"
          style={{ fontSize: '1.25rem', color: 'white' }}
          component={aboutPath ? 'button' : 'a'}
          target={aboutPath ? undefined : '_blank'}
          href={aboutPath ? undefined : href}
          onClick={handler}
          startIcon={icon}
        >
          <Typography color="secondary" style={{ textTransform: 'none' }}>
            {t('About')}
          </Typography>
        </Button>
      )}
      {renderedContentDialog}
    </>
  );
});

export default About;
